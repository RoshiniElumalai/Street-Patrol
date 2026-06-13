# StreetSentinel Backend Testing Guide

Welcome to the Developer Testing Mode. This scalable, modular Express backend uses in-memory mock data stores. Since it runs entirely locally, it is lightning fast and perfect for frontend development.

## 1. Running the Server

Open your terminal in the `/server` folder and run:
```bash
npm install
npm run dev
```
You should see: `StreetSentinel scalable mock backend running on port 4000`.

## 2. Testing Endpoints

You can use `curl`, Postman, or ThunderClient to test these endpoints.

### Health Check
```bash
curl http://localhost:4000/
```
Expected: `StreetSentinel Backend Running`

### Register a new Citizen
```bash
curl -X POST http://localhost:4000/auth/register \
-H "Content-Type: application/json" \
-d '{"name": "Sarah Connor", "phone": "555-0100", "address": "Tech District", "emergencyContact": "911", "profileImage": "https://i.pravatar.cc/150?u=sarah"}'
```

### Trigger an Emergency Alert
```bash
curl -X POST http://localhost:4000/alerts/alert \
-H "Content-Type: application/json" \
-d '{"userId": "usr_citizen_1", "userName": "John Doe", "threatType": "Scream Detected", "location": {"lat": 40.7128, "lng": -74.0060}}'
```
*Note: This will instantly broadcast via Socket.IO to any connected Police Dashboards.*

### Start a SafeWalk Session
```bash
curl -X POST http://localhost:4000/safewalk/start \
-H "Content-Type: application/json" \
-d '{"userId": "usr_citizen_1", "destination": "Home", "estimatedTime": "15m", "routeInfo": "Main St -> 5th Ave", "currentLocation": {"lat": 40.7128, "lng": -74.0060}}'
```

### End SafeWalk
```bash
curl -X POST http://localhost:4000/safewalk/end \
-H "Content-Type: application/json" \
-d '{"sessionId": "sw_your_generated_id_here"}'
```

### Get Active Alerts
```bash
curl http://localhost:4000/alerts/active-alerts
```

### Get All Users
```bash
curl http://localhost:4000/users/
```
