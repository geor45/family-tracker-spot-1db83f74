# 📍 Family GPS

> Real-time family location tracking application built with React, TypeScript, Supabase and Capacitor.

Family GPS is a modern location-sharing application designed to help family members stay connected and see each other's location in real time.

The application combines live location tracking, background geolocation, family groups, location history, interactive maps and push notifications in a secure and responsive environment.

---

## 🚀 Features

### 📍 Real-time Location Tracking

- Live location updates for family members
- Native background location tracking on mobile devices
- Automatic location updates
- Real-time synchronization between family members
- Latest known location storage
- Historical location storage

### 👨‍👩‍👧‍👦 Family Groups

- Create a private family
- Join a family using an invite code
- View all family members in one place
- Display family members on the map
- Family-based access control
- Private family membership

### 🗺️ Interactive Maps

- Modern MapTiler maps
- Leaflet-based map interface
- Real-time family member markers
- Automatic map positioning
- Detailed map navigation
- Smooth zoom and navigation
- Location history displayed as a route

### 🕐 Location History

- View previous locations
- Select a specific family member
- Select different time ranges
- Display historical movement
- Draw location history as a map route
- Interactive history map

### 🔔 Push Notifications

- Instant notifications between family members
- Custom "Ξύπνα βλάκα" notification
- Firebase Cloud Messaging
- Android notification channel
- Sound notifications
- Vibration support
- Server-side recipient validation

### 🔐 Authentication

- Email/password authentication
- User registration
- Secure login
- Password recovery
- Password reset
- Protected application routes

### 🛡️ Family-based Security

- Supabase Row Level Security
- Family-based data isolation
- Protected family data
- Server-side authorization
- Protected push notification endpoint
- Users can only access members of their own family

### 📱 Mobile Application

- Android support
- iOS support
- Capacitor integration
- Native background location
- Firebase Cloud Messaging
- Native notification support

### 💻 Responsive Web Application

- Desktop support
- Mobile-friendly interface
- Responsive layouts
- Modern user interface
- Optimized map experience

---

## 🛠️ Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- TanStack Start
- TanStack Router
- Tailwind CSS

### Maps & Location

- Leaflet
- MapTiler
- OpenStreetMap data
- Background Geolocation

### Backend & Database

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Realtime
- Row Level Security (RLS)

### Mobile

- Capacitor
- Android
- iOS
- Firebase Cloud Messaging (FCM)

### Deployment & Development

- GitHub
- Vercel
- npm

---

## 🏛️ Application Architecture

Family GPS follows a modern client-server architecture that connects the frontend with authentication, database, mapping and push notification services.

### System Overview

```text
                    ┌─────────────────────┐
                    │     Family GPS      │
                    │      Frontend       │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
        ┌──────────┐     ┌──────────┐    ┌──────────┐
        │ Supabase │     │ MapTiler │    │ Firebase │
        │   Auth   │     │   Maps   │    │   FCM    │
        └─────┬────┘     └──────────┘    └──────────┘
              │
              ▼
        ┌──────────────┐
        │  PostgreSQL  │
        │   Database   │
        └──────────────┘

---

The main application components communicate through Supabase services, while MapTiler provides the map infrastructure and Firebase Cloud Messaging handles mobile push notifications.

---


## 📍 Location Tracking
The application supports native background location tracking on mobile devices.
Location information is stored using two main data structures:
- latest_locations — latest known location of each user
- location_history — historical location data
The application also uses realtime updates so family members can see location changes without manually refreshing the map.
On supported mobile devices, the application can continue collecting location data while running in the background.

## 👨‍👩‍👧‍👦 Family System
Each user belongs to a private family.
A family owner can create a family and share the generated invite code with other members.
The family structure can be represented as:
Family
├── Owner
├── Member
├── Member
└── Member
Family membership is enforced at the database level using Supabase Row Level Security.
Users can only access location and family information belonging to their own family.

## 🗺️ Maps
Family GPS uses Leaflet together with MapTiler for the interactive map experience.
The map provides:
- Live family member markers
- Location visualization
- Automatic positioning
- Zoom and navigation
- Historical routes
- Responsive map interaction
Map data is based on OpenStreetMap data and rendered through MapTiler.

## 🕐 Location History
The Location History section allows users to inspect previous movement.
Users can:
1. Select a family member
2. Select a time range
3. Load historical location data
4. View the movement route on the map
5. Zoom and navigate through the route
This provides a clear visual representation of previous locations and movement.

## 🔔 Push Notifications
Family GPS includes a custom push notification system for communication between family members.
The notification system uses:
- Firebase Cloud Messaging
- Native Android notification channels
- Notification sound
- Vibration
- Server-side authorization
- Family membership validation
The application validates that the sender and recipient belong to the same family before sending a notification.

## 🔐 Authentication
Authentication is handled through Supabase Auth.
The application supports:
- Account registration
- Email/password login
- Logout
- Password recovery
- Password reset
- Protected application routes
Authentication state is also used to determine access to family-related data.

## 🛡️ Security
Security is implemented at both the database and server levels.
The application uses:
- Supabase Authentication
- PostgreSQL Row Level Security
- Family-based access control
- Protected database queries
- Server-side authorization
- Protected push notification endpoints
- Environment variables for sensitive configuration
Sensitive credentials and API keys are not stored in the GitHub repository.

## 📱 Mobile Application
The project is prepared for native mobile deployment through Capacitor.
The mobile architecture provides access to native capabilities such as:
- Background location tracking
- Push notifications
- Android notification channels
- Native device functionality
The application is structured to support both Android and iOS environments.

## 💻 Responsive Web Application
Family GPS is designed to work across different screen sizes.
The interface supports:
- Desktop computers
- Tablets
- Mobile devices
The map and application interface adapt to smaller screens while maintaining the core functionality of the application.

## 🗄️ Database
The application uses PostgreSQL through Supabase.
The database includes structures for:
- User profiles
- Latest locations
- Location history
- Push notification tokens
- Wake signals
- Families
- Family members
Family-related access is protected through database-level Row Level Security policies.

## 🔄 Realtime Communication
Family GPS uses Supabase Realtime to keep location information synchronized.
When a family member's latest location changes, other authorized family members can receive the update without manually refreshing the application.
This allows the map to behave as a live family location dashboard.
⚙️ Local Development
1. Clone the repository
git clone https://github.com/geor45/family-tracker-spot-1db83f74.git
cd family-tracker-spot-1db83f74
2. Install dependencies
npm install
3. Configure environment variables
Create a .env file in the project root.
Required environment variables include:
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_MAPTILER_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
Never commit .env files, API keys or server secrets to GitHub.

4. Start the development server
npm run dev
The application will then be available through the local development server.
## 📦 Production Build
To create a production build:
npm run build
The project is configured to generate the production application through the Vite/TanStack build process.

## 🌐 Deployment
The web application is deployed through Vercel.
The source code is maintained through GitHub, while production environment variables are configured separately in the deployment environment.
The production setup includes:
- Vercel
- Supabase
- MapTiler
- Firebase Cloud Messaging
Sensitive server-side credentials remain outside the public repository.
📂 Project Structure
src/
├── components/
├── routes/
├── lib/
├── assets/
└── ...

supabase/
├── migrations/
└── ...

android/
├── app/
└── ...

public/
└── favicon.ico
The project is organized around reusable React components, route-based application pages, Supabase services and native mobile integrations.

## 🎯 Project Goals
Family GPS was developed with a focus on:
- Real-time family location sharing
- Privacy between family groups
- Secure data access
- Background location tracking
- Mobile and web compatibility
- Realtime communication
- Push notifications
- Simple user experience
- Modern web technologies
- Cross-platform development

## 👨‍💻 Developer
Γεώργιος Βασιλείου
Full-Stack Web & Mobile Developer
Building modern web applications, mobile applications and custom digital solutions.

## 📄 License
This project was developed for demonstration and portfolio purposes.
