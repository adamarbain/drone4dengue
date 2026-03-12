## 2. Recommended Algorithms

### A. Tree-Based Ensemble Models (Best for Tabular Data)

**Algorithms:**  
- XGBoost  
- LightGBM  
- Random Forest  

**Why:**  
These models can capture complex **non-linear relationships** between variables. For example, dengue outbreaks may depend on a specific combination of **high humidity + moderate temperature + rainfall**, which linear models struggle to capture.

**Logical Fit:**  
- Very strong performance on **structured/tabular datasets**.  
- Robust to **outliers and skewed distributions**.  
- Handles **mixed feature types** well.  
- **LightGBM** is particularly efficient when working with many categorical variables such as **state, city, and suburb**, reducing the need for heavy one-hot encoding.

---

### B. Time-Series & Sequence Models (Best for Lagged Effects)

**Algorithms:**  
- LSTM (Long Short-Term Memory)  
- Prophet  

**Why:**  
Dengue outbreaks are **seasonal and time-dependent**. Environmental factors affect mosquito breeding cycles with a delay.  

LSTM models are designed to **remember past information**, making them suitable for learning patterns such as how **rainfall from 14 days ago influences today's cases**.

**Logical Fit:**  
- Best used when data is **aggregated by time intervals** (weekly or monthly).  
- Captures **temporal dependencies** and outbreak momentum.  
- More effective than static regression models when predicting **future outbreaks based on past trends**.

---

### C. Specialized Count Regressors (The Statistical Choice)

**Algorithms:**  
- Poisson Regression  
- Negative Binomial Regression  

**Why:**  
`activeCases` is a **count variable** (non-negative integers). Traditional regression models may produce **invalid predictions such as negative case counts**.

**Logical Fit:**  
- Designed specifically for **count data and rare events**.  
- Handles datasets where most values are **small counts but occasionally large spikes**.  
- **Negative Binomial Regression** works better when the data shows **overdispersion** (variance larger than the mean), which is common in disease outbreak data.

---

### D. Geospatial Clustering (To Identify Hotspots)

**Algorithms:**  
- DBSCAN  
- K-Means  

**Purpose:**  
Used mainly for **feature engineering**, not direct prediction.

**Why:**  
Clustering can identify **geographic hotspots** of dengue outbreaks before running predictive models.

**Relational Logic:**  
A case occurring in a **densely populated urban suburb** may have a higher spread risk compared to one in a **rural area**.  

Using **latitude and longitude coordinates** to create cluster IDs allows the model to incorporate **spatial relationships and population density patterns**.

---

## 3. Honest "Pro-Tips" for Success

Achieving a high-performing model is **not just about choosing the right algorithm**. In most real-world machine learning projects:

> **Algorithms contribute ~20% of performance, while data preparation and feature engineering contribute ~80%.**

Below are key practices that significantly improve model performance.

---

### 1. Create Lagged Features

Do not rely only on **current weather conditions**.

Mosquito breeding and dengue transmission follow **biological cycles**, meaning environmental factors affect outbreaks with a delay.

Create lagged variables such as:

- `rainfall_7_days_ago`
- `rainfall_14_days_ago`
- `humidity_7_days_ago`
- `temperature_14_days_ago`

These features allow the model to learn **cause-effect relationships across time**, which are critical for dengue prediction.

---

### 2. Log-Transform the Target Variable

Dengue case data usually has a **long-tailed distribution**:
- Most records have **very few cases**
- A small number of records have **large outbreaks**

Training the model directly on this skewed distribution can cause the model to **over-focus on rare spikes**.

A common solution is to transform the target variable:

**Benefits:**
- Stabilizes variance  
- Reduces the influence of extreme outbreak values  
- Helps the model learn the **general pattern of outbreaks**

---

### 3. Use Geospatial Encoding

Instead of only feeding **latitude and longitude** into the model, include **administrative region features** such as:

- `state`
- `district`
- `city`
- `postcode`

**Reason:**  
Public health interventions, infrastructure quality, sanitation, and reporting systems are often organized by **administrative boundaries**. These regional patterns strongly influence dengue transmission dynamics.

Combining **geographical coordinates with administrative regions** provides the model with richer spatial context.

---

## Practical Model Strategy (Recommended Workflow)

A strong dengue prediction pipeline typically follows this approach:

1. **Feature Engineering**
   - Weather lag features
   - Geospatial clusters
   - Seasonal indicators (month, week)

2. **Baseline Model**
   - Poisson or Negative Binomial Regression

3. **High-Performance Model**
   - LightGBM or XGBoost

4. **Temporal Model (Optional Enhancement)**
   - LSTM for time-series outbreak prediction

5. **Evaluation**
   - RMSE / MAE for regression
   - Compare with baseline statistical models

---

## Final Advice

For most real-world dengue prediction systems using tabular data:

> **LightGBM + strong feature engineering is often the most effective solution.**

Complex models like LSTM only outperform tree models when:
- There is **long historical time-series data**, and  
- The dataset is **structured as sequences rather than independent rows**.
