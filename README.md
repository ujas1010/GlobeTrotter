# Wanderful Planner

`Problem Statement`

**Design and develop a complete travel planning application where users can:

--Create customized multi-city itineraries
--Assign travel dates, activities, and budgets
--Discover activities and destinations through search
--Receive cost breakdowns and visual calendars
--Share their plans publicly or with friends

The application must demonstrate proper use of relational databases to store and retrieve complex travel data such as user-specific itineraries, stops, activities, and estimated expenses. The system should also support dynamic user interfaces that adapt to each user's trip flow.

--Features: 
The application for `GlobalTrotters` will include the following comprehensive set of features, ensuring a rich and user-friendly experience across desktop or mobile platforms:

1. Login / Signup Screen
--Description: Entry point of the app allowing users to create or access their account.
--Purpose: Authenticate users to manage personal travel plans.
--Key Functionality/Components: Email & password fields, Login button, Signup link, "Forgot Password", basic validation.

2. Dashboard / Home Screen
--Description: Central hub showing upcoming trips, popular cities, and quick actions.
--Purpose: Allows users to navigate to their trips and explore inspiration.
--Key Functionality/Components: Welcome message, list of recent trips, “Plan New Tripˮ button, recommended destinations, budget highlights.

3. Create Trip Screen
--Description: Form to initiate a new trip by providing a name, travel dates, and a description.
--Purpose: Begins the process of creating a personalized travel plan.
--Key Functionality/Components: Trip name, start & end dates, trip description, cover photo upload (optional), save button.

4. My Trips (Trip List) Screen
--Description: List view of all trips created by the user with basic summary data.
--Purpose: Easily access and manage existing or upcoming trips.
--Key Functionality/Components: Trip cards showing name, date range, destination count, edit/view/delete actions.

5. Itinerary Builder Screen
--Description: Interface to add cities, dates, and activities for each stop.
--Purpose: Construct the full day-wise trip plan in an interactive format.
--Key Functionality/Components: “Add Stopˮ button, select city and travel dates, assign activities to each stop, reorder cities.

6. Itinerary View Screen
--Description: Visual representation of the completed trip itinerary.
--Purpose: Review the full plan in a structured format (timeline or grouped by cities).
--Key Functionality/Components: Day-wise layout, city headers, activity blocks with time and cost, view mode toggle (calendar/list).

7. City Search
--Description: Search interface to find and add cities to a trip, with info like country, cost index, and popularity.
--Purpose: Discover and include relevant cities in the itinerary.
--Key Functionality/Components: Search bar, list of cities with meta info, “Add to Tripˮ button, filter by country/region.

8. Activity Search
--Description: Browse and select things to do in each stop, categorized by interest or cost.
--Purpose: Enrich trips with experiences like sightseeing, food tours, or adventure activities.
--Key Functionality/Components: Activity filters (type, cost, duration), add/remove buttons, quick view of description and images.

9. Trip Budget & Cost Breakdown Screen
--Description: Summarized financial view showing estimated total cost and breakdowns.
--Purpose: Helps travelers stay informed and within budget.
--Key Functionality/Components: Cost breakdown by transport, stay, activities, meals; pie/bar charts, average cost per day, alerts for overbudget days.

10. Trip Calendar / Timeline Screen
--Description: Calendar-based or vertical timeline view of the full itinerary.
--Purpose: Helps users visualize the journey and daily plan flow.
--Key Functionality/Components: Calendar component, expandable day views, drag-to-reorder activities, quick editing options.

11. Shared/Public Itinerary View Screen
--Description: Public page displaying a sharable version of an itinerary.
--Purpose: Allows others to view, get inspired, or copy the trip.
--Key Functionality/Components: Public URL, itinerary summary, “Copy Tripˮ button, social media sharing, read-only view.

12. User Profile / Settings Screen
--Description: User settings page to update profile information and preferences.
--Purpose: Enables users to control their data, preferences, and privacy.
--Key Functionality/Components: Editable fields (name, photo, email), language preference, delete account, saved destinations list.

13. Admin / Analytics Dashboard (Optional)
--Description: Admin-only interface to track user trends, trip data, and platform usage.
--Purpose: Helps in monitoring app adoption, popular cities, and user behavior.
--Key Functionality/Components: Tables and charts of trips created, top cities/activities, user engagement stats, user management tools.

# GlobeTrotter — Multi-City Travel Itinerary Planner

A modern web application to plan multi-city trips with day-wise activity scheduling, live budget tracking, worldwide location discovery, and shareable itineraries.


## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
