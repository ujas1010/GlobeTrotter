<div align="center">

# <img src="public/favicon.png" alt="GlobeTrotter Logo" width="34" height="34" style="vertical-align: middle; margin-right: 8px; border-radius: 6px;" /> GlobeTrotter

### **Next-Gen Multi-City Travel Planner & Itinerary Engine**

A modern, full-stack travel planning platform with day-wise itinerary builder, dynamic budget tracking, global destination discovery, and responsive mobile-first design.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-globetrotter--black.vercel.app-10b981?style=for-the-badge&logo=vercel)](https://globetrotter-black.vercel.app/)
[![React](https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

[**Explore Live Application →**](https://globetrotter-black.vercel.app/) · [**Report Bug**](https://github.com/ujas1010/GlobeTrotter/issues) · [**Request Feature**](https://github.com/ujas1010/GlobeTrotter/issues)

</div>

---

## 🌟 Key Features

| Feature | Description |
| :--- | :--- |
| 🗺️ **Multi-City Route Planner** | Plan multi-destination expeditions with automated timeline generation, stop sequencing, and date validation. |
| 💰 **Live Budget Engine** | Real-time budget monitoring, average daily spend calculation, and activity cost breakdown. |
| 🔍 **Worldwide Destination Explorer** | Search through millions of global cities, regions, and districts with GeoNames geocoding and live catalogue addition. |
| ⏱️ **Day-Wise Activity Timeline** | Schedule timed activities, categorise expenses (Sightseeing, Dining, Transport), and track duration per stop. |
| 🔒 **Enterprise Authentication** | Google OAuth integration and secure email/password authentication with session persistence via Supabase. |
| 📱 **Mobile-First Responsive Design** | Optimized viewport ergonomics, adaptive typography, and native-feeling mobile bottom bar navigation with safe-area insets. |
| 👤 **User Profile & Customization** | Manage avatar uploads, display names, and private travel preferences. |

---

## 🛠️ Tech Stack

```
Frontend:       React 19, TanStack Router, TanStack Query, Tailwind CSS v4, Lucide Icons
Backend / BaaS: Supabase (PostgreSQL, Auth, RLS, Storage)
Framework:      TanStack Start & Vite 8 with Nitro SSR Engine
Deployment:     Vercel Edge Platform
```

---

## 🗄️ Database Architecture

```mermaid
erDiagram
    PROFILES ||--o{ TRIPS : "creates"
    TRIPS ||--o{ TRIP_STOPS : "contains"
    TRIP_STOPS ||--o{ TRIP_ACTIVITIES : "schedules"
    CITIES ||--o{ TRIP_STOPS : "located at"

    PROFILES {
        uuid id PK
        text display_name
        text avatar_url
        timestamp created_at
    }

    TRIPS {
        uuid id PK
        uuid user_id FK
        text name
        text description
        date start_date
        date end_date
        numeric budget
        boolean is_public
    }

    TRIP_STOPS {
        uuid id PK
        uuid trip_id FK
        uuid city_id FK
        integer position
        date arrival_date
        date departure_date
    }

    TRIP_ACTIVITIES {
        uuid id PK
        uuid stop_id FK
        text name
        text category
        numeric cost
        time start_time
        integer duration_minutes
    }

    CITIES {
        uuid id PK
        text name
        text country
        text region
        numeric cost_index
        integer popularity
    }
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm** / **pnpm** / **bun**

### 1. Clone the repository
```bash
git clone https://github.com/ujas1010/GlobeTrotter.git
cd GlobeTrotter
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 4. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 📦 Production Build

```bash
npm run build
npm run preview
```

---

## 👤 Author

**Ujas Darji**
- GitHub: [@ujas1010](https://github.com/ujas1010)
- Live Project: [GlobeTrotter on Vercel](https://globetrotter-black.vercel.app/)

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
