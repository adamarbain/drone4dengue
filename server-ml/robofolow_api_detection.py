# import the inference-sdk
from inference_sdk import InferenceHTTPClient
import json

# initialize the client
CLIENT = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key="1jgNe8OZcnOOk2JgN95a"
)

# infer on a local image
print("Running inference on YOUR_IMAGE.jpg...")
result = CLIENT.infer("YOUR_IMAGE.jpg", model_id="drone4dengue-ja1rz/3")

# Print the results
print("\n=== DETECTION RESULTS ===")
print(json.dumps(result, indent=2))