# **App Name**: AttendEase

## Core Features:

- Mobile Check-in: Student ID input with Wi-Fi SSID verification and biometric authentication check. It should trigger upon pressing a dedicated check-in button.
- Instructor Dashboard: Display a live-updating table of student IDs and check-in times, fetched from the local API. Automatically poll for new data every 5 seconds.
- Local API: Local API (running on classroom PC's hotspot) exposing endpoints to save check-ins and return all check-ins as JSON. Detect the MAC address of the user's phone to ensure each device signs the attendance only once.

## Style Guidelines:

- A calming blue (#3498db) for a professional feel.
- A light gray (#ecf0f1) for backgrounds and subtle accents.
- A vibrant green (#2ecc71) to indicate success and completion.
- Clean, sans-serif fonts for optimal readability on both mobile and web.
- Simple, flat icons to represent actions and status (e.g., check-in success, Wi-Fi status).
- Mobile-first, responsive design that adapts to different screen sizes.