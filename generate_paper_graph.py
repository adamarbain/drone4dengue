import matplotlib.pyplot as plt
import numpy as np

# Data from your terminal output
models = ['Stacking Ensemble', 'XGBoost', 'Gradient Boosting', 'LightGBM', 'Random Forest', 'Ridge Regression']

# R2 Scores
r2_historical = [0.9246, 0.9059, 0.8833, 0.8792, 0.8528, 0.5575]
r2_weather = [0.7809, 0.6988, 0.6959, 0.6775, 0.6742, 0.5272]

# Set up the plot style for academic papers
try:
    plt.style.use('seaborn-v0_8-whitegrid')
except OSError:
    # Fallback if seaborn-v0_8-whitegrid is not available in older matplotlib versions
    plt.style.use('seaborn-whitegrid')

fig, ax = plt.subplots(figsize=(10, 6))

x = np.arange(len(models))
width = 0.35

# Create grouped bar chart
rects1 = ax.bar(x - width/2, r2_historical, width, label='Historical Cases Model', color='#2c3e50', edgecolor='black')
rects2 = ax.bar(x + width/2, r2_weather, width, label='Weather-based Model', color='#e74c3c', edgecolor='black')

# Add labels, title, and formatting
ax.set_ylabel('R² Score (Coefficient of Determination)', fontsize=12, fontweight='bold')
ax.set_title('Predictive Performance Comparison Across Model Architectures', fontsize=14, fontweight='bold', pad=15)
ax.set_xticks(x)
ax.set_xticklabels(models, rotation=45, ha='right', fontsize=11)
ax.legend(fontsize=11)

# Add value labels on top of the bars
def autolabel(rects):
    for rect in rects:
        height = rect.get_height()
        ax.annotate(f'{height:.2f}',
                    xy=(rect.get_x() + rect.get_width() / 2, height),
                    xytext=(0, 3),  # 3 points vertical offset
                    textcoords="offset points",
                    ha='center', va='bottom', fontsize=9)

autolabel(rects1)
autolabel(rects2)

plt.ylim(0, 1.05)
plt.tight_layout()

# Save as high-res PNG for the paper
plt.savefig('model_performance_chart.png', dpi=300, bbox_inches='tight')
print("Graph saved as model_performance_chart.png")
