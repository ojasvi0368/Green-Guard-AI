"""
ML Crop Recommendation Prediction Script
Loads the trained model and predicts the best crop based on soil and weather parameters.

Usage:
    echo '{"N":90,"P":42,"K":43,"temperature":20.87,"humidity":82.0,"ph":6.5,"rainfall":202.93}' | python ml/predict_crop.py
"""

import sys
import json
import os

def predict():
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())

        # Validate required fields
        required_fields = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
        for field in required_fields:
            if field not in input_data:
                print(json.dumps({"error": f"Missing required field: {field}"}))
                sys.exit(1)

        # Import ML libraries (lazy import to fail fast with clear error)
        try:
            import joblib
            import numpy as np
        except ImportError as e:
            print(json.dumps({"error": f"Missing dependency: {str(e)}. Run: pip install joblib scikit-learn"}))
            sys.exit(1)

        # Load the trained model
        model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models', 'crop_recommendation.joblib')

        if not os.path.exists(model_path):
            print(json.dumps({"error": f"Model file not found at: {model_path}"}))
            sys.exit(1)

        model = joblib.load(model_path)

        # Prepare features array in the order the model expects:
        # [N, P, K, temperature, humidity, ph, rainfall]
        features = np.array([[
            float(input_data['N']),
            float(input_data['P']),
            float(input_data['K']),
            float(input_data['temperature']),
            float(input_data['humidity']),
            float(input_data['ph']),
            float(input_data['rainfall'])
        ]])

        # Predict
        prediction = model.predict(features)

        # The model returns the crop name directly
        crop = str(prediction[0])

        # Custom Analysis/Explanation for the recommendation
        analysis = f"Based on the analysis of your farm's soil and climate, {crop} is highly recommended. "
        
        # NPK analysis
        if float(input_data['N']) > 70:
            analysis += "Your soil shows high nitrogen levels, which this crop thrives in. "
        if float(input_data['P']) > 40:
            analysis += "Adequate phosphorus content will support strong root development. "
        
        # pH analysis
        ph_val = float(input_data['ph'])
        if 6.0 <= ph_val <= 7.5:
            analysis += "The slightly acidic to neutral pH is ideal for nutrient absorption. "
        elif ph_val < 6.0:
            analysis += "The acidic nature of your soil suits this specific crop variety. "
        
        # Rainfall analysis
        if float(input_data['rainfall']) > 150:
            analysis += "Abundant rainfall in your region provides the necessary irrigation for high yield."
        else:
            analysis += "This crop is selected for its efficiency in your region's moisture conditions."

        # Output result
        result = {
            "crop": crop,
            "analysis": analysis,
            "input": {
                "N": float(input_data['N']),
                "P": float(input_data['P']),
                "K": float(input_data['K']),
                "temperature": float(input_data['temperature']),
                "humidity": float(input_data['humidity']),
                "ph": float(input_data['ph']),
                "rainfall": float(input_data['rainfall'])
            }
        }

        # Try to get prediction probabilities if the model supports it
        try:
            if hasattr(model, 'predict_proba'):
                probabilities = model.predict_proba(features)[0]
                classes = model.classes_
                # Get top 3 predictions
                top_indices = probabilities.argsort()[-3:][::-1]
                result["alternatives"] = [
                    {"crop": str(classes[i]), "confidence": round(float(probabilities[i]) * 100, 1)}
                    for i in top_indices
                ]
                result["confidence"] = round(float(probabilities[top_indices[0]]) * 100, 1)
        except Exception:
            pass  # If probabilities not available, just return the prediction

        print(json.dumps(result))

    except json.JSONDecodeError:
        print(json.dumps({"error": "Invalid JSON input"}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    predict()
