# Track-ME

**Track-ME** is a privacy-focused health dashboard designed for patients with Long Covid and ME/CFS. It empowers users to take control of their data by analyzing health trends from the **Visible** app.

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-green)

## 🚀 Features

-   **Data Ingestion**: Drag-and-drop CSV uploads from the Visible app export (Long Format support).
-   **Smart Normalization**: Automatically processes symptoms, HRV, and Resting Heart Rate. Captures all custom trackers (e.g., "Brain Fog", "Crash") into a flexible storage system.
-   **Composite Health Score**: Calculates a daily wellness score (0-100) combining inverted symptom severity and HRV.
-   **Experiment Engine**: Track medications or lifestyle changes (e.g., "Low Dose Naltrexone", "Pacing").
    -   **Statistical Analysis**: Automatically compares health metrics "Before" vs "During" an experiment.
    -   **Significance Testing**: Flags whether changes are statistically significant.
-   **Privacy First**: Row Level Security (RLS) ensures only YOU can see your data.

## 🛠 Tech Stack

-   **Framework**: Next.js 15 (App Router)
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS + shadcn/ui
-   **Database**: Supabase (PostgreSQL)
-   **Auth**: Supabase Auth (SSR)
-   **Visualization**: Recharts
-   **Analytics**: simple-statistics

## ⚡️ Getting Started

### Prerequisites

-   Node.js 18+
-   A Supabase project

### Installation

1.  **Clone the repo**
    ```bash
    git clone https://github.com/yourusername/track-me.git
    cd track-me
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Setup Environment Variables**
    cp `.env.local.example` to `.env.local` and fill in your Supabase credentials:
    ```bash
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Initialize Database**
    Run the SQL script found in `supabase/schema.sql` in your Supabase SQL Editor to set up tables and RLS policies.

5.  **Run Development Server**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000).

## 🧪 Running Tests

We use Jest for unit testing our analytics logic:

```bash
npm test
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
