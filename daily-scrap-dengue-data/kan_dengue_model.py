"""
Phase 4: Kolmogorov-Arnold Network (KAN) for Dengue Prediction
==============================================================

This script trains a KAN on the engineered weather and geographic features.
It uses a Poisson Negative Log-Likelihood loss function to accommodate the 
highly skewed count distribution of active dengue cases.
"""

import pandas as pd
import numpy as np
import torch
import torch.nn.functional as F
from torch.utils.data import TensorDataset, DataLoader
import torch.nn as nn
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.cluster import KMeans
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from kan import KAN
import warnings
warnings.filterwarnings('ignore')

def load_and_prepare_data(csv_file='active_dengue.csv'):
    print("Loading and preprocessing data for KAN...")
    df = pd.read_csv(csv_file)
    df['date'] = pd.to_datetime(df['date'], format='%d/%m/%Y')

    # Chronological cutoff
    cutoff_date = pd.to_datetime('18/12/2025', format='%d/%m/%Y')
    df = df[df['date'] >= cutoff_date].copy()

    # Normalize coordinates
    if 'x' in df.columns: df = df.rename(columns={'x': 'centroid_x', 'y': 'centroid_y'})

    # --- Merge Hotspot Data ---
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

        hotspot_keys = hotspot_df[['cx_round', 'cy_round', 'date']].drop_duplicates().assign(is_hotspot=1)
        df = df.merge(hotspot_keys, on=['cx_round', 'cy_round', 'date'], how='left')
        df['is_hotspot'] = df['is_hotspot'].fillna(0).astype(int)
        df.drop(columns=['cx_round', 'cy_round'], inplace=True)
    except Exception as e:
        df['is_hotspot'] = 0
        print("Proceeding without hotspot data.")

    # --- Temporal & Geographic Features ---
    df['month'] = df['date'].dt.month
    df['day_of_year'] = df['date'].dt.dayofyear
    df['week_of_year'] = df['date'].dt.isocalendar().week
    
    le_state = LabelEncoder()
    df['state_encoded'] = le_state.fit_transform(df['state'])
    kmeans = KMeans(n_clusters=10, random_state=42)
    df['location_cluster'] = kmeans.fit_predict(df[['centroid_x', 'centroid_y']])

    # --- Phase 1: Weather Lags & Biological Features ---
    df = df.sort_values(['centroid_x', 'centroid_y', 'date']).reset_index(drop=True)
    loc_group = df.groupby(['centroid_x', 'centroid_y'])
    
    df['rainfall_lag_7'] = loc_group['rainfall'].shift(7)
    df['humidity_lag_7'] = loc_group['humidity'].shift(7)
    df['temperature_lag_7'] = loc_group['temperature'].shift(7)
    df['rainfall_cumul_14d'] = loc_group['rainfall'].transform(lambda x: x.rolling(14, min_periods=1).sum())
    df['rainfall_cumul_28d'] = loc_group['rainfall'].transform(lambda x: x.rolling(28, min_periods=1).sum())
    
    df['temp_x_humidity'] = df['temperature'] * df['humidity']
    df['temp_x_rainfall'] = df['temperature'] * df['rainfall']
    df['humidity_x_rainfall'] = df['humidity'] * df['rainfall']
    df['breeding_favorable'] = ((df['temperature'].between(25, 35)) & (df['humidity'] > 60) & (df['rainfall'] > 0)).astype(int)
    
    df['rainfall_ewma_14d'] = loc_group['rainfall'].transform(lambda x: x.ewm(span=14, adjust=False).mean())
    df['temp_ewma_7d'] = loc_group['temperature'].transform(lambda x: x.ewm(span=7, adjust=False).mean())
    df['humidity_ewma_7d'] = loc_group['humidity'].transform(lambda x: x.ewm(span=7, adjust=False).mean())
    
    T_min, T_max = 13.3, 39.2
    temp_clipped = df['temperature'].clip(lower=T_min, upper=T_max)
    df['briere_thermal_curve'] = temp_clipped * (temp_clipped - T_min) * np.sqrt(T_max - temp_clipped)

    # --- Select Features ---
    features = [
        'centroid_x', 'centroid_y', 'humidity', 'temperature', 'rainfall',
        'month', 'day_of_year', 'week_of_year', 'location_cluster', 'state_encoded', 
        'is_hotspot', 'rainfall_lag_7', 'humidity_lag_7', 'temperature_lag_7',
        'rainfall_cumul_14d', 'rainfall_cumul_28d', 'temp_x_humidity', 
        'temp_x_rainfall', 'humidity_x_rainfall', 'breeding_favorable',
        'rainfall_ewma_14d', 'temp_ewma_7d', 'humidity_ewma_7d', 'briere_thermal_curve'
    ]
    
    X = df[features].copy()
    y = df['total_active_cases'].copy()

    X = X.fillna(X.median(numeric_only=True)).fillna(0)
    
    # Chronological Split (Train 80% / Test 20%)
    split_date = df['date'].quantile(0.8)
    train_mask = df['date'] <= split_date
    test_mask = df['date'] > split_date
    
    X_train, X_test = X[train_mask], X[test_mask]
    y_train, y_test = y[train_mask], y[test_mask]
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    return X_train_scaled, X_test_scaled, y_train.values, y_test.values, len(features)

def train_kan():
    X_train, X_test, y_train, y_test, num_features = load_and_prepare_data()
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"\nTraining KAN on device: {device}")
    
    # Convert to PyTorch Tensors
    X_train_t = torch.tensor(X_train, dtype=torch.float32).to(device)
    y_train_t = torch.tensor(y_train, dtype=torch.float32).view(-1, 1).to(device)
    X_test_t = torch.tensor(X_test, dtype=torch.float32).to(device)
    y_test_t = torch.tensor(y_test, dtype=torch.float32).view(-1, 1).to(device)
    
    # Create DataLoaders
    train_dataset = TensorDataset(X_train_t, y_train_t)
    train_loader = DataLoader(train_dataset, batch_size=256, shuffle=True)
    
    # Initialize Kolmogorov-Arnold Network
    # Width: [Input dimension, Hidden layer neurons, Output dimension]
    model = KAN(width=[num_features, 8, 1], grid=5, k=3, seed=42, device=device)
    
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
    
    # Poisson Negative Log-Likelihood Loss
    # log_input=False because we will apply Softplus to ensure predictions are positive
    criterion = nn.PoissonNLLLoss(log_input=False)
    
    epochs = 20
    print(f"Starting Training for {epochs} Epochs...")
    
    for epoch in range(epochs):
        model.train()
        total_loss = 0
        
        for batch_X, batch_y in train_loader:
            optimizer.zero_grad()
            
            # Forward pass
            raw_preds = model(batch_X)
            
            # Softplus ensures all predicted counts are strictly positive 
            # (Poisson math breaks if predictions go below 0)
            preds = F.softplus(raw_preds)
            
            loss = criterion(preds, batch_y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
            
        print(f"Epoch {epoch+1}/{epochs} | Loss: {total_loss/len(train_loader):.4f}")
        
    # Evaluation
    model.eval()
    with torch.no_grad():
        raw_test_preds = model(X_test_t)
        test_preds = F.softplus(raw_test_preds).cpu().numpy().flatten()
    
    mse = mean_squared_error(y_test, test_preds)
    mae = mean_absolute_error(y_test, test_preds)
    r2 = r2_score(y_test, test_preds)
    
    print("\n" + "="*50)
    print("KOLMOGOROV-ARNOLD NETWORK (KAN) TEST RESULTS")
    print("="*50)
    print(f"MSE: {mse:.4f}")
    print(f"MAE: {mae:.4f}")
    print(f"R²:  {r2:.4f}")
    
    return model

if __name__ == "__main__":
    train_kan()