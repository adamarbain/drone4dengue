"""
Phase 3: Spatio-Temporal Graph Neural Network (STGCN) for Dengue Prediction
===========================================================================

This script models dengue outbreaks as a geographic network. It uses PyTorch Geometric 
to capture how outbreaks spread spatially between nearby locations over time.
"""

import pandas as pd
import numpy as np
import torch
import torch.nn.functional as F
from torch_geometric.data import Data
from torch_geometric.nn import GCNConv
import torch.nn as nn
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import warnings
warnings.filterwarnings('ignore')

# ---------------------------------------------------------------------------
# 1. Network Architecture (STGCN)
# ---------------------------------------------------------------------------
class STGCN(nn.Module):
    def __init__(self, num_node_features, hidden_channels):
        super(STGCN, self).__init__()
        # Spatial Layer: Graph Convolution
        self.conv1 = GCNConv(num_node_features, hidden_channels)
        self.conv2 = GCNConv(hidden_channels, hidden_channels)
        
        # Temporal Layer: LSTM
        self.lstm = nn.LSTM(
            input_size=hidden_channels, 
            hidden_size=hidden_channels, 
            num_layers=1, 
            batch_first=True
        )
        
        # Output Layer: Regression to predict active cases
        self.linear = nn.Linear(hidden_channels, 1)

    def forward(self, x, edge_index):
        # x shape: [num_nodes, num_features]
        
        # 1. Spatial Message Passing
        x = self.conv1(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, p=0.2, training=self.training)
        
        x = self.conv2(x, edge_index)
        x = F.relu(x)
        
        # 2. Temporal Processing 
        # (Reshape for LSTM: [batch, sequence, features] -> treating each node as a batch of 1 seq)
        x = x.unsqueeze(1) 
        x, _ = self.lstm(x)
        x = x.squeeze(1)
        
        # 3. Final Prediction
        x = self.linear(x)
        
        # Ensure non-negative output for count data
        return F.softplus(x)

# ---------------------------------------------------------------------------
# 2. Data Processing and Graph Construction
# ---------------------------------------------------------------------------
def create_spatial_graph(df, distance_threshold=0.05):
    """
    Creates the spatial edges between locations based on coordinate distance.
    distance_threshold: approx degrees (0.05 is roughly 5.5km)
    """
    print("Building spatial graph...")
    # Extract unique locations
    locations = df[['centroid_x', 'centroid_y']].drop_duplicates().reset_index(drop=True)
    num_nodes = len(locations)
    
    # Map coordinates to node IDs
    loc_to_id = {tuple(x): i for i, x in enumerate(locations.values)}
    
    edges = []
    # Calculate pairwise distances (simple Euclidean for demonstration)
    coords = locations.values
    for i in range(num_nodes):
        for j in range(i + 1, num_nodes):
            dist = np.sqrt(np.sum((coords[i] - coords[j])**2))
            if dist < distance_threshold:
                # Add bi-directional edge
                edges.append([i, j])
                edges.append([j, i])
                
    edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous()
    print(f"Graph created with {num_nodes} nodes and {edge_index.shape[1] // 2} edges.")
    return loc_to_id, edge_index, num_nodes

def prepare_stgcn_data(csv_path):
    print("Loading data for STGCN...")
    df = pd.read_csv(csv_path)
    df['date'] = pd.to_datetime(df['date'], format='%d/%m/%Y')
    
    # Filter to recent data to manage memory
    cutoff_date = pd.to_datetime('18/12/2025', format='%d/%m/%Y')
    df = df[df['date'] >= cutoff_date].copy()
    
    # Ensure standard column names
    if 'x' in df.columns: df = df.rename(columns={'x': 'centroid_x', 'y': 'centroid_y'})
    
    # --- MERGE DENGUE HOTSPOT DATA ---
    try:
        hotspot_df = pd.read_csv('dengue_hotspot.csv')
        hotspot_df['date'] = pd.to_datetime(hotspot_df['date'], format='%d/%m/%Y')
        hotspot_df = hotspot_df[hotspot_df['date'] >= cutoff_date].copy()
        
        if 'x' in hotspot_df.columns: 
            hotspot_df = hotspot_df.rename(columns={'x': 'centroid_x', 'y': 'centroid_y'})
            
        df['cx_round'] = df['centroid_x'].round(4)
        df['cy_round'] = df['centroid_y'].round(4)
        hotspot_df['cx_round'] = hotspot_df['centroid_x'].round(4)
        hotspot_df['cy_round'] = hotspot_df['centroid_y'].round(4)

        hotspot_keys = hotspot_df[['cx_round', 'cy_round', 'date']].drop_duplicates()
        hotspot_keys = hotspot_keys.assign(is_hotspot=1)
        
        df = df.merge(hotspot_keys, on=['cx_round', 'cy_round', 'date'], how='left')
        df['is_hotspot'] = df['is_hotspot'].fillna(0).astype(float)
        df.drop(columns=['cx_round', 'cy_round'], inplace=True)
        print(f"Hotspot data merged. Hotspot days: {int(df['is_hotspot'].sum())}")
    except Exception as e:
        df['is_hotspot'] = 0.0
        print(f"Warning: Failed to merge hotspot data ({e}). Proceeding without.")

    # Create Graph Edges
    loc_to_id, edge_index, num_nodes = create_spatial_graph(df)
    
    # --- UPDATED FEATURES LIST ---
    # Added 'is_hotspot' to the node features
    features = ['humidity', 'temperature', 'rainfall', 'is_hotspot']
    
    # Impute missing weather values
    weather_features = ['humidity', 'temperature', 'rainfall']
    df[weather_features] = df[weather_features].fillna(df[weather_features].median())
    
    # Scale ONLY the continuous weather features, not the binary hotspot flag
    scaler = StandardScaler()
    df[weather_features] = scaler.fit_transform(df[weather_features])
    
    # Group by chronologically
    dates = sorted(df['date'].unique())
    snapshots = []
    
    for d in dates:
        day_data = df[df['date'] == d]
        
        x_day = torch.zeros((num_nodes, len(features)), dtype=torch.float)
        y_day = torch.zeros((num_nodes, 1), dtype=torch.float)
        mask_day = torch.zeros((num_nodes,), dtype=torch.bool) 
        
        for _, row in day_data.iterrows():
            node_id = loc_to_id[(row['centroid_x'], row['centroid_y'])]
            x_day[node_id] = torch.tensor([row[f] for f in features])
            y_day[node_id] = torch.tensor([row['total_active_cases']])
            mask_day[node_id] = True
            
        snapshots.append((x_day, y_day, mask_day))
        
    # Split chronologically (80% Train, 20% Test)
    split_idx = int(len(snapshots) * 0.8)
    train_snapshots = snapshots[:split_idx]
    test_snapshots = snapshots[split_idx:]
    
    print(f"Prepared {len(train_snapshots)} training days, {len(test_snapshots)} testing days.")
    return train_snapshots, test_snapshots, edge_index, len(features)

# ---------------------------------------------------------------------------
# 3. Training Loop
# ---------------------------------------------------------------------------
def train_stgcn():
    # Load and prepare graph data
    train_data, test_data, edge_index, num_features = prepare_stgcn_data('active_dengue.csv')
    
    # Initialize Model
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Training on device: {device}")
    
    model = STGCN(num_node_features=num_features, hidden_channels=32).to(device)
    edge_index = edge_index.to(device)
    
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01, weight_decay=5e-4)
    # Using Poisson NLL Loss which is ideal for count data
    criterion = nn.PoissonNLLLoss(log_input=False)
    
    epochs = 50
    print("\nStarting STGCN Training...")
    
    for epoch in range(epochs):
        model.train()
        total_loss = 0
        
        # Train chronologically day by day
        for x, y, mask in train_data:
            x, y, mask = x.to(device), y.to(device), mask.to(device)
            
            optimizer.zero_grad()
            out = model(x, edge_index)
            
            # Only calculate loss for nodes that had actual data recorded that day
            loss = criterion(out[mask], y[mask])
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            
        if (epoch + 1) % 10 == 0:
            print(f"Epoch {epoch+1}/{epochs} | Loss: {total_loss/len(train_data):.4f}")
            
    # Evaluation
    model.eval()
    all_preds, all_targets = [], []
    
    with torch.no_grad():
        for x, y, mask in test_data:
            x, y, mask = x.to(device), y.to(device), mask.to(device)
            out = model(x, edge_index)
            
            all_preds.extend(out[mask].cpu().numpy().flatten())
            all_targets.extend(y[mask].cpu().numpy().flatten())
            
    mse = mean_squared_error(all_targets, all_preds)
    mae = mean_absolute_error(all_targets, all_preds)
    r2 = r2_score(all_targets, all_preds)
    
    print("\n" + "="*50)
    print("STGCN TEST RESULTS")
    print("="*50)
    print(f"MSE: {mse:.4f}")
    print(f"MAE: {mae:.4f}")
    print(f"R²:  {r2:.4f}")
    
    return model

if __name__ == "__main__":
    train_stgcn()