# API Endpoints

## Autentificare

### POST /auth/login
Autentificare utilizator.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "user": {
    "uid": "string",
    "email": "string",
    "role": "string",
    "subscription": {
      "type": "basic" | "fitness" | "nutrition" | "complete",
      "status": "active" | "expired" | "pending_renewal"
    }
  },
  "token": "string"
}
```

### POST /auth/register
Înregistrare utilizator nou.

**Request Body:**
```json
{
  "email": "string",
  "password": "string",
  "name": "string",
  "profile": {
    "height": "number",
    "weight": "number",
    "birthdate": "string",
    "gender": "string",
    "medicalConditions": ["string"],
    "dietaryRestrictions": ["string"],
    "fitnessGoals": ["string"],
    "foodPreferences": {
      "liked": ["string"],
      "disliked": ["string"]
    },
    "fitnessLevel": "beginner" | "intermediate" | "advanced"
  }
}
```

## Utilizatori

### GET /user/profile
Obține profilul utilizatorului curent.

**Response:**
```json
{
  "id": "string",
  "email": "string",
  "name": "string",
  "profile": {
    "height": "number",
    "weight": "number",
    "birthdate": "string",
    "gender": "string",
    "medicalConditions": ["string"],
    "dietaryRestrictions": ["string"],
    "fitnessGoals": ["string"],
    "foodPreferences": {
      "liked": ["string"],
      "disliked": ["string"]
    },
    "fitnessLevel": "string"
  },
  "progress": {
    "weightLogs": [{
      "date": "string",
      "value": "number"
    }],
    "measurements": [{
      "date": "string",
      "chest": "number",
      "waist": "number",
      "hips": "number"
    }],
    "photos": [{
      "date": "string",
      "url": "string"
    }]
  },
  "subscription": {
    "type": "string",
    "startDate": "timestamp",
    "endDate": "timestamp",
    "status": "string",
    "paymentHistory": [{
      "date": "timestamp",
      "amount": "number",
      "status": "string",
      "confirmedBy": "string"
    }],
    "totalDue": "number"
  }
}
```

### PUT /user/profile
Actualizează profilul utilizatorului.

**Request Body:**
```json
{
  "name": "string",
  "profile": {
    "height": "number",
    "weight": "number",
    "medicalConditions": ["string"],
    "dietaryRestrictions": ["string"],
    "fitnessGoals": ["string"],
    "foodPreferences": {
      "liked": ["string"],
      "disliked": ["string"]
    }
  }
}
```

## Antrenamente

### GET /workouts
Obține lista de antrenamente.

**Query Parameters:**
- `page`: number
- `limit`: number
- `type`: string
- `level`: string

**Response:**
```json
{
  "workouts": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "level": "string",
      "exercises": [
        {
          "id": "string",
          "name": "string",
          "sets": "number",
          "reps": "number",
          "weight": "number",
          "rest": "number",
          "completed": "boolean"
        }
      ],
      "notes": "string",
      "status": "planned" | "completed" | "missed"
    }
  ],
  "total": "number"
}
```

### POST /workouts/generate
Generează un plan de antrenament personalizat.

**Request Body:**
```json
{
  "goals": ["string"],
  "level": "string",
  "preferences": {
    "duration": "number",
    "equipment": ["string"],
    "restrictions": ["string"]
  }
}
```

## Nutriție

### GET /nutrition/plans
Obține planurile nutriționale.

**Query Parameters:**
- `page`: number
- `limit`: number
- `type`: string
- `date`: string

**Response:**
```json
{
  "plans": [
    {
      "id": "string",
      "date": "string",
      "meals": [
        {
          "type": "breakfast" | "lunch" | "dinner" | "snack",
          "foods": [
            {
              "id": "string",
              "name": "string",
              "quantity": "number",
              "unit": "string"
            }
          ],
          "macros": {
            "calories": "number",
            "protein": "number",
            "carbs": "number",
            "fats": "number"
          }
        }
      ],
      "water": "number",
      "notes": "string"
    }
  ],
  "total": "number"
}
```

### POST /nutrition/analyze
Analizează o imagine de mâncare.

**Request Body:**
```form-data
{
  "image": "file"
}
```

**Response:**
```json
{
  "foods": [
    {
      "name": "string",
      "calories": "number",
      "macros": {
        "protein": "number",
        "carbs": "number",
        "fat": "number"
      }
    }
  ],
  "followsPlan": "boolean",
  "aiComments": "string"
}
```

## Grupe și Prezențe

### GET /groups
Obține lista de grupe.

**Query Parameters:**
- `page`: number
- `limit`: number
- `level`: string

**Response:**
```json
{
  "groups": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "difficultyLevel": "string",
      "maxCapacity": "number",
      "schedule": [
        {
          "dayOfWeek": "number",
          "startTime": "string",
          "endTime": "string",
          "location": "string"
        }
      ],
      "trainer": "string",
      "active": "boolean"
    }
  ],
  "total": "number"
}
```

### POST /groups/absence
Anunță absența la o ședință.

**Request Body:**
```json
{
  "sessionId": "string",
  "reason": "string"
}
```

### GET /groups/recoveries
Obține ședințele de recuperare disponibile.

**Query Parameters:**
- `dateRange`: string
- `level`: string

**Response:**
```json
{
  "recoveries": [
    {
      "id": "string",
      "groupId": "string",
      "date": "string",
      "startTime": "string",
      "endTime": "string",
      "availableSlots": "number"
    }
  ]
}
```

## Administrare

### GET /admin/users
Obține lista de utilizatori (doar admin).

**Query Parameters:**
- `page`: number
- `limit`: number
- `role`: string
- `subscription`: string

**Response:**
```json
{
  "users": [
    {
      "id": "string",
      "email": "string",
      "name": "string",
      "role": "string",
      "subscription": {
        "type": "string",
        "status": "string",
        "endDate": "timestamp"
      },
      "group": {
        "groupId": "string",
        "joinDate": "timestamp"
      }
    }
  ],
  "total": "number"
}
```

### PUT /admin/users/:id
Actualizează datele unui utilizator (doar admin).

**Request Body:**
```json
{
  "role": "string",
  "subscription": {
    "type": "string",
    "startDate": "timestamp",
    "endDate": "timestamp"
  },
  "group": {
    "groupId": "string"
  }
}
```

### POST /admin/equipment
Adaugă/actualizează echipamente sală.

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "status": "active" | "maintenance",
  "restrictions": ["string"],
  "muscleGroups": ["string"]
}
```

## Notificări

### GET /notifications
Obține notificările utilizatorului.

**Query Parameters:**
- `page`: number
- `limit`: number
- `type`: string

**Response:**
```json
{
  "notifications": [
    {
      "id": "string",
      "type": "string",
      "message": "string",
      "read": "boolean",
      "createdAt": "timestamp"
    }
  ],
  "total": "number"
}
```

### PUT /notifications/:id/read
Marchează o notificare ca citită.

**Response:**
```json
{
  "success": "boolean"
}
``` 