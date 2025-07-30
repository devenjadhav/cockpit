# 🚀 Daydream Portal - Local Setup Guide

Welcome! This guide will help you set up the hackathon organizer portal locally for testing.

## 📋 Quick Start Checklist

### 1. Prerequisites
- [ ] Node.js 18+ installed ([Download here](https://nodejs.org/))
- [ ] Airtable account ([Sign up](https://airtable.com/))
- [ ] Loops account ([Sign up](https://loops.so/))

### 2. Initial Setup
```bash
# Clone/navigate to the project
cd daydream-portal

# Run the setup script
./setup.sh
```

### 3. Get API Credentials

#### 🗃️ Airtable Setup
1. Go to [Airtable API page](https://airtable.com/api)
2. Click "Generate API key" 
3. Copy your **API key** (starts with `key...`)
4. Create a new base or use existing one
5. Copy your **Base ID** from the API docs (starts with `app...`)

#### 📧 Loops Setup
1. Go to [Loops API Settings](https://app.loops.so/settings/api-keys)
2. Create a new API key
3. Copy the **API key**

### 4. Configure Environment
Edit the `.env` file and replace the placeholder values:
```env
AIRTABLE_API_KEY=keyYourActualApiKey
AIRTABLE_BASE_ID=appYourActualBaseId
LOOPS_API_KEY=your_actual_loops_api_key
```

### 5. Set Up Airtable Tables

You already have the events data! Just make sure your Airtable base has a table named **"daydream-events"** with your current structure.

#### Your Current Events Table Structure
Your table should have these fields (which match your CSV):

| Field Name | Field Type | Required | Notes |
|------------|------------|----------|-------|
| event_name | Single line text | ✅ | Event name |
| poc_first_name | Single line text | ✅ | Organizer first name |
| poc_last_name | Single line text | ✅ | Organizer last name |
| location | Single line text | ✅ | Event location |
| email | Email | ✅ | Organizer email (THIS IS KEY!) |
| city | Single line text | ✅ | Event city |
| country | Single line text | ✅ | Event country |
| event_format | Single line text | ❌ | Format (e.g., "24-hours") |
| estimated_attendee_count | Number | ❌ | Expected attendees |
| triage_status | Single line text | ✅ | Status (e.g., "Approved") |
| project_url | URL | ❌ | Organizer's project URL |
| project_description | Long text | ❌ | Project description |
| slug | Single line text | ❌ | URL slug |
| lat | Number | ❌ | Latitude |
| long | Number | ❌ | Longitude |

#### Attendees Table Structure (Optional)
If you want to track attendees, create a table called **"Attendees"** with these fields:

| Field Name | Field Type | Required | Notes |
|------------|------------|----------|-------|
| Event ID | Single line text | ✅ | Links to Events table |
| First Name | Single line text | ✅ | Attendee first name |
| Last Name | Single line text | ✅ | Attendee last name |
| Email | Email | ✅ | Attendee email |
| Registration Date | Date | ✅ | When they registered |
| Status | Single select | ✅ | Options: registered, checked-in, no-show, cancelled |

### 6. Test with Your Existing Data

Your CSV data already contains Daydream events! Just make sure:

1. **Table name is "daydream-events"** (or update the code)
2. **Find YOUR email** in the data (should be in one of the events)
3. **Use that email** for login testing

For example, if you see an event with `email: your.email@hackclub.com`, use that email for testing.

### 7. Set Up Loops Email Templates

The magic link template is already configured with ID: `cmdou0ehu03zj450ilibd1rzx`

Make sure your Loops template includes these variables:
- **Variables**: `loginUrl`, `expirationMinutes`, `email`

Optional templates you can create:

#### Event Update Template  
- **ID**: `event-update`
- **Variables**: `eventName`, `updateType`, `updateDetails`

#### Welcome Template
- **ID**: `welcome-organizer`
- **Variables**: `firstName`, `organizationName`

#### Capacity Alert Template
- **ID**: `capacity-alert`
- **Variables**: `eventName`, `currentAttendees`, `maxCapacity`

### 8. Start the Servers
```bash
./run-local.sh
```

## 🧪 Testing the Login Flow

### Step 1: Access the Frontend
1. Open browser to `http://localhost:3000`
2. You should see a login page

### Step 2: Request Magic Link
1. Enter YOUR email (the one in your Airtable Events)
2. Click "Send Magic Link"
3. Should see "Magic link sent to your email"

### Step 3: Check Email/Logs
Since Loops might not be configured:
- Check your email for the magic link
- OR check backend logs for the generated magic link URL
- OR check Loops dashboard for sent emails

### Step 4: Complete Login
1. Click the magic link or copy the token from logs
2. Should redirect to dashboard
3. Should see your events and stats

## 🐛 Common Issues & Solutions

### "Email not found" Error
**Problem**: Your email isn't in the Airtable Events table  
**Solution**: Add an event with your exact email address

### "Failed to send email" Error
**Problem**: Loops API key is invalid or templates don't exist  
**Solution**: 
- Verify LOOPS_API_KEY in .env
- Create required email templates in Loops dashboard

### Backend Won't Start
**Problem**: Port 5000 is in use  
**Solution**: 
- Change PORT in .env file
- Update NEXT_PUBLIC_API_URL in frontend/.env.local

### Airtable Connection Error
**Problem**: Invalid API credentials  
**Solution**: 
- Verify AIRTABLE_API_KEY starts with "key"
- Verify AIRTABLE_BASE_ID starts with "app"
- Check table names are exactly "Events" and "Attendees"

### Frontend API Errors
**Problem**: API calls failing  
**Solution**: 
- Ensure backend is running on port 5000
- Check NEXT_PUBLIC_API_URL in frontend/.env.local

## 📱 URLs for Testing

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Dashboard**: http://localhost:3000/dashboard
- **API Health**: http://localhost:5000/

## 🔧 Development Commands

```bash
# Backend only
npm run dev

# Frontend only  
cd frontend && npm run dev

# Build for production
npm run build
cd frontend && npm run build

# Run tests (if implemented)
npm test
cd frontend && npm test
```

## 📞 Need Help?

1. Check the logs: `tail -f logs/backend.log logs/frontend.log`
2. Verify your .env file has all required values
3. Make sure your Airtable tables match the schema exactly
4. Test API endpoints directly: `curl http://localhost:5000/`

Happy hacking! 🎉
