# Stonehaven Investment Group — Master Project Overview

> **AI context instruction:** Read this entire document before planning or implementing work on this project. Treat it as the persistent product overview and source of truth for the intended platform. Do not begin implementation from this overview alone; use the user's current phased implementation plan and latest instructions to determine what should be built.

**Document version:** Master Build Prompt V2

---

PROJECT OVERVIEW
Build a complete, world-class dual investment platform called STONEHAVEN INVESTMENT GROUP (to be filled in). The platform is a HYIP and stock broker system built with React, Firebase (Firestore + Auth), and Cloudinary for media uploads. The platform has three user types: Super Admin, Sub-Admin, and User. It supports three investment products: Flash Investment, Crypto Investment, and Stock Investment.

TECH STACK
Frontend:        React (single page application)
Database:        Firebase Firestore
Authentication:  Firebase Auth
File Uploads:    Cloudinary (free tier)
Charts:          TradingView embeddable widgets (free)
Styling:         Tailwind CSS
Hosting:         Firebase Hosting

=========================================
STONEHAVEN INVESTMENT GROUP
DESIGN DIRECTION
=========================================

Theme:
Modern Heritage Finance

Base:
Deep Navy (#0F172A)
Stone Gray (#F5F5F4)
Charcoal (#1F2937)

Accents:
Heritage Gold (#C8A55A)
Forest Green (#2F6B4F)
Burgundy (#6D2836)

Card Style:
Premium Glassmorphism
Frosted glass effect
Soft shadows
16px rounded corners
Subtle gold borders
Luxury banking aesthetic

Typography:
Headings:
Playfair Display
Cormorant Garamond

Body:
Inter
Source Sans Pro

Feel:
BlackRock meets Private Banking
Generational wealth management
Family trust and legacy
World-class financial institution
Conservative and professional
Safe, secure, established

Animations:
Smooth and elegant
Fade-in transitions
Staggered reveals on scroll
Premium hover interactions
No flashy crypto-style effects

Data Visualization:
Institutional-grade charts
Portfolio performance widgets
Stock market dashboards
Investment growth tracking
Clean financial analytics

Dashboard Style:
Fixed sidebar navigation
Large card-based layout
Generous whitespace
Professional financial widgets
Executive reporting interface

Brand Personality:
Trustworthy
Stable
Established
Professional
Family-Oriented
Long-Term Focused

Visual Inspiration:
J.P. Morgan Private Bank
Goldman Sachs Wealth Management
BlackRock
Morgan Stanley
Traditional Family Offices

Logo Direction:
Stone Arch Symbol
Shield Emblem
Elegant "S" Monogram
Oak Tree Crest
Heritage-inspired mark

Homepage Feel:
Luxury investment firm
Private wealth management
Institutional credibility
Premium investor experience
Built for generations

Tagline:
"Building Wealth for Generations"

Mobile:
Fully responsive
Mobile-first dashboard
Native-app feel
Premium interactions
Fast and lightweight

=========================================
OVERALL FEEL
=========================================

A trusted investment institution that feels
like it has managed family wealth for over
50 years while leveraging modern technology
to provide world-class investment services.
SECTION 1 — LANDING PAGE
Navigation Bar
Fixed at top
Transparent on hero
Solid dark on scroll
Logo left
Links: [Plans] [How It Works] [About] [FAQ]
Right: [Login] [Get Started]
Section 1 — Hero
Full screen dark luxury hero
Animated TradingView ticker banner
scrolling across very top:
BTC $67,420 ▲  AAPL $189.23 ▲  ETH $3,241 ▲

Large bold headline:
"The World's Premier Dual Investment Platform"

Subheadline:
"Grow your wealth through Crypto & Stock
investments with guaranteed fixed returns"

Two CTA buttons:
[Get Started — It's Free]  [View Investment Plans]

Subtle blurred TradingView chart in background
Testimonial toast notifications active
bottom left corner from page load
Section 2 — Trust Stats
Animated number counters on scroll:
$2.4B+ Paid Out
48,000+ Investors
120+ Countries
98.7% Satisfaction
Section 3 — Dual Broker Showcase
Two cards side by side:
₿ CRYPTO BROKER
📈 STOCK BROKER
Each showing what they offer
returns, plan range, CTA button
Section 4 — Investment Plans
Tab switcher: [Crypto Plans] [Stock Plans]
Full plan table displayed publicly:
Weekly Capital | After 2 Months | After 3 Months
$200 → $87,000 → $88,000
$300 → $87,000 → $108,000
$400 → $107,000 → $128,000
$500 → $127,000 → $148,000
$600 → $147,000 → $168,000
$700 → $167,000 → $188,000
$800 → $187,000 → $208,000
$1,000 → $227,000 → $248,000
CTA: [Start Investing Now]
Section 5 — Investment Calculator
Interactive calculator — no login required
User inputs:
  Select plan type (Flash/Crypto/Stock)
  Weekly capital amount (slider or input)
  Duration (2 months or 3 months)
  
Calculator shows instantly:
  Total capital to invest
  Projected return
  Net profit
  Return on investment %

Flash plan version:
  Input capital amount
  Shows profit instantly
  Shows duration

Drives conversions — user sees
their potential earnings before
even registering
[Start Earning Now] CTA below result
Section 6 — How It Works
4 step visual process:
① Register
② Choose Plan
③ Deposit Weekly
④ Earn at Maturity
Section 7 — Why Choose Us
Icon grid:
🔒 Fixed Returns
📊 Real-Time Charts
🌍 Global Access
⚡ Instant Activation
💬 24/7 Support
🏦 Secure Platform
Section 8 — Testimonials Carousel
10-15 preset investor testimonials
Auto-rotates every 5 seconds
Star ratings, name, country
Section 9 — Live Activity Feed
Scrolling feed of recent activity
Pulls from 200 preset notifications
database same as toast system
"Sarah M. just withdrew $148,000"
"Ahmed K. activated a new BTC plan"
Updates live appearance
Section 10 — FAQ
Accordion style
Category tabs:
[All][General][Deposits][Withdrawals]
[Crypto][Stocks][Account]
All content admin editable
Section 11 — Final CTA
Full width bold section
"Ready to grow your wealth?"
"Join 48,000+ investors"
[Create Free Account]  [Login]
Footer
Logo + tagline
Links: About, Plans, FAQ, Contact
Terms & Conditions link
Privacy Policy link
© 2025 [Platform Name]. All rights reserved.
Risk disclaimer

SECTION 2 — AUTHENTICATION
Registration Page
Full name
Email address
Password
Confirm password
Phone number
Country (dropdown)
Referral code (optional — pre-filled if
came via referral or sub-admin link)
adminId (invisible — pre-filled from
sub-admin onboarding link if applicable)
Checkbox: "I agree to Terms & Privacy"
[Create Account]
Already have account? [Login]
Login Page
Email
Password
Remember me
Forgot password link
[Login]
Role detection on login:
superadmin → /superadmin/dashboard
sub-admin → /admin/dashboard
user → /dashboard
Forgot Password
Email input
Send reset link
Firebase Auth password reset
Onboarding Screen (First Login Only)
"Welcome to [Platform Name], [Name] 👋
What would you like to invest in?"

Two cards:
₿ CRYPTO — [Start Here]
📈 STOCKS — [Start Here]

"Or explore both — you can switch anytime"
Choice saved to user profile

SECTION 3 — USER DASHBOARD
Layout
Fixed sidebar left (desktop)
Collapsible sidebar:
  Expanded — full labels + icons
  Collapsed — icons only
  Toggle button to expand/collapse
  More screen space when collapsed
Bottom nav (mobile)
Top bar with:
  Platform logo
  [₿ Crypto] ←toggle→ [📈 Stocks]
  Notification bell with unread badge
  Profile avatar dropdown
Sidebar Navigation
📊 Dashboard
⚡ Flash Investment
₿ Crypto / 📈 Stocks (based on toggle)
💼 My Portfolio
📈 Earnings Statistics
💰 Deposit
📤 Withdraw
👥 Referrals
🔔 Notifications
🪪 KYC Verification
💬 Support
🏛️ About / Company
⚙️ Settings
Wallet Summary Widget
Glassmorphism card style
Available Balance:    $133,000  ← withdrawable
Referral Balance:     $640      ← separate
─────────────────────────────────
Locked in Plans:      $503,000  🔒
Total Portfolio:      $636,640
TradingView Chart
CRYPTO SIDE:
Large TradingView chart
Tabs: [BTC][ETH][SOL][BNB][XRP]
Candlestick / Line toggle
Timeframes: 1H 4H 1D 1W 1M

STOCK SIDE:
Large TradingView chart
Tabs: [AAPL][TSLA][NVDA][MSFT][AMZN]
Candlestick / Line toggle
Timeframes: 1H 4H 1D 1W 1M
Active Investments Section
Glassmorphism cards per active plan:
Plan name, weekly capital
Weeks completed X of Y
Progress bar
Transaction timeline per plan
Projected return locked
Next deposit due countdown
[Make Deposit] [View Details]
Announcement Banner
If admin has sent an announcement:
Dismissible banner appears at top
of dashboard below top bar
Gold bordered notification card
User can dismiss — won't show again

SECTION 4 — EARNINGS STATISTICS PAGE
Dedicated full page for earnings overview

SUMMARY CARDS
Total Earned All Time:     $215,000
Best Single Return:        $168,000
Average Return Rate:       2,700%
Total Plans Completed:     3

EARNINGS CHART
Monthly earnings bar chart
Shows earnings per month
Last 12 months view
Interactive hover tooltips

EARNINGS BREAKDOWN TABLE
Plan         Asset   Capital  Return    Date
3-Month      AAPL    $7,800   $168,000  Jun 2025
2-Month      BTC     $4,800   $88,000   Mar 2025  
Flash        —       $200     $300      Jan 2025

PER ASSET BREAKDOWN
AAPL  ████████████  $168,000  (52%)
BTC   ████████      $88,000   (27%)
Flash ████          $300      (21% combined)

COMPLETED PLANS HISTORY
Full list of all completed investments
Date started, date matured
Capital invested, return received

SECTION 5 — TRANSACTION TIMELINE
Visual timeline per active investment plan
Shown inside plan detail view:

APPLE INC. (AAPL) — INVESTMENT TIMELINE
─────────────────────────────────────────
Week 1  ✅ Jun 01 — $600 deposited & approved
Week 2  ✅ Jun 08 — $600 deposited & approved
Week 3  ✅ Jun 15 — $600 deposited & approved
Week 4  🟠 Jun 22 — Missed (plan paused)
Week 5  ✅ Jun 29 — $600 deposited & approved
Week 6  ⏳ Jul 06 — Due in 3 days
Week 7  🔒 Jul 13 — Upcoming
...
Week 13 🎯 Aug 24 — Maturity — $168,000

Each week node clickable
Shows deposit details on click
Admin approval timestamp shown
Clean vertical timeline design

SECTION 6 — KYC VERIFICATION
User KYC Flow
User goes to KYC Verification page

Step 1 — Personal Information
  Full legal name
  Date of birth
  Nationality
  Residential address

Step 2 — Document Upload
  ID Type selection:
    National ID / Passport / Driver's License
  Front of ID (Cloudinary upload)
  Back of ID (Cloudinary upload)
  Selfie holding ID (Cloudinary upload)

Step 3 — Proof of Address
  Utility bill or bank statement
  (Cloudinary upload)
  Must be less than 3 months old

Step 4 — Submit
  Status → 🟡 Pending Review

KYC Status shown on dashboard:
❌ Unverified — [Complete KYC]
🟡 Pending — "Under review"
✅ Verified — Green badge on profile
🔴 Rejected — Reason shown + resubmit
KYC Withdrawal Rules
Unverified users:
  Can invest freely
  Can withdraw up to $500 (admin editable limit)
  Above limit requires KYC

Verified users:
  Full withdrawal access
  No limits

Admin editable:
  Unverified withdrawal limit amount
  Turn KYC requirement on/off entirely
  Turn withdrawal limit on/off
Admin KYC Review
KYC REVIEW QUEUE
─────────────────────────────────────────────────────────
User        Submitted    Documents    Status    Action
David O.    Jun 05       [View All]   Pending   [✅ Approve][❌ Reject][📋 Request More]
Sarah M.    Jun 04       [View All]   Pending   [✅ Approve][❌ Reject][📋 Request More]
─────────────────────────────────────────────────────────

Admin clicks View All:
  Sees all uploaded documents
  Full screen document viewer
  Zoom in capability

On Approve:
  User KYC status → ✅ Verified
  User notified instantly

On Reject:
  Admin enters rejection reason
  User notified with reason
  User can resubmit

Request More Info:
  Admin requests specific document
  User notified with request details

SECTION 7 — ANNOUNCEMENT CENTER
Admin Side
ANNOUNCEMENT CENTER
─────────────────────────────────────────────
[+ Create New Announcement]

Title:      [                              ]
Message:    [                              ]
            [                              ]
Type:       [Info ▼] [Warning] [Promotion]
Audience:   [All Users ▼]
            [Specific Admin's Users]
            [Individual User]
Schedule:   [Send Now] [Schedule for later]
Status:     [Draft / Published]

[Preview]  [Save Draft]  [Publish]
─────────────────────────────────────────────
PUBLISHED ANNOUNCEMENTS
Title              Audience   Sent        Action
New Flash Plan     All Users  Jun 05      [Edit][Delete]
Maintenance        All Users  Jun 01      [Edit][Delete]
─────────────────────────────────────────────
User Side
Notification bell badge shows count
Click bell → notification dropdown

Inside dashboard:
Dismissible gold-bordered banner
at top of page for active announcements

Dedicated notifications page:
All announcements listed
Date and time
Mark as read
Dismiss

SECTION 8 — NOTIFICATION CENTER
Full Notification System
Bell icon in top navigation bar
Unread count badge (red dot)

Click bell → dropdown panel:
─────────────────────────────────────
🔔 NOTIFICATIONS
[Mark All Read]  [View All]
─────────────────────────────────────
🟢 Your AAPL investment matured
    $168,000 credited — Jun 05
    
🟡 Week 6 deposit due in 2 days
    Apple Inc. — $600 required
    
✅ Deposit approved — Week 5
    AAPL — $600 — Jun 01
    
👥 Referral bonus earned
    John M. activated a plan — $60
    
📢 Platform announcement
    New Flash Plan tiers available
─────────────────────────────────────
[View All Notifications]
Full Notifications Page
All notifications listed
Filter: [All][Investments][Deposits]
        [Withdrawals][Referrals][Announcements]
Mark individual as read
Delete individual
Mark all as read
Delete all
Timestamp per notification
Notification Types
Investment related:
  Week deposit due reminder
  Deposit approved
  Deposit rejected + reason
  Investment activated
  Investment paused
  Investment resumed
  Investment frozen + reason
  Investment deleted + reason
  Investment matured + amount

Flash plan:
  Flash plan activated
  Flash plan matured + profit

Referral:
  Referral bonus earned + amount
  Referral withdrawal approved

Withdrawals:
  Withdrawal approved
  Withdrawal rejected + reason

Support:
  New reply on support ticket

Announcements:
  New platform announcement

KYC:
  KYC approved
  KYC rejected + reason
  KYC document request

SECTION 9 — FLASH INVESTMENT
User Flow
User clicks Flash Investment
Sees plan table:
Capital → Profit After [X] Hours
$50    → $80
$100   → $150
$200   → $300
$300   → $450
$500   → $700
$1,000 → $1,300

User selects tier
Sees plan summary
Proceeds to deposit
Admin approves
Countdown starts
At maturity → profit credited
to available balance
Upsell to weekly plans shown
Rules
One time deposit — no weekly obligation
Fixed profit credited at maturity only
Nothing credited before maturity
Multiple simultaneous flash plans allowed
Admin limit on max plans per user
Live countdown timer on dashboard
Glassmorphism card display
Admin Editable (Per Admin)
Duration (hours) — fully editable
Plan name — editable
Each tier capital — editable
Each tier profit — editable
Add unlimited new tiers
Delete any tier
Activate/deactivate tiers
Turn flash plan on/off entirely
Existing plans locked at original values
New plans use latest settings

SECTION 10 — CRYPTO INVESTMENT
Coins
Admin managed coin library
Unlimited coins
Each coin has:
  Name (editable)
  Ticker (editable)
  Logo (Cloudinary upload)
  Status active/inactive
  Own investment plan tiers
User Flow
User clicks Start New Crypto Investment
Sees coin picker grid
Each coin shows live price (TradingView)
User clicks coin
Investment plan table appears
User selects weekly capital + duration
Sees plan summary with projected return
Investment calculator shown inline
Proceeds to deposit
Admin approves
Week 1 activates
Weekly Deposit Logic
Every 7 days from start date
new deposit window opens
User gets reminder notification
User deposits weekly capital
Uploads proof (Cloudinary)
Admin approves
Week counter advances
Duration: 2 months = 8 weeks
          3 months = 13 weeks
Missed Week Logic
No deposit within window
Plan auto-pauses → 🟠 Paused
User notified immediately
Other plans unaffected
User deposits when ready
Admin approves
Plan resumes
Duration extends by paused days
Projected return unchanged
Maturity Logic
Final week deposit approved
Plan → ✅ Completed
Full projected return credited
to available balance instantly
User notified
Earnings statistics page updated
Investment Plan Per Coin Per Admin
Weekly Capital | 2 Month Return | 3 Month Return
$200  → $87,000  → $88,000
$300  → $87,000  → $108,000
$400  → $107,000 → $128,000
$500  → $127,000 → $148,000
$600  → $147,000 → $168,000
$700  → $167,000 → $188,000
$800  → $187,000 → $208,000
$1,000 → $227,000 → $248,000
All amounts admin editable per coin

SECTION 11 — STOCK INVESTMENT
Stocks
Admin managed stock library
Up to 10 active stocks
Each stock has:
  Company name (editable)
  Ticker (editable)
  Logo (Cloudinary upload)
  Sector (editable)
  Status active/inactive
  Own investment plan tiers
  Full research page (all editable)
Stock Research Page
Company name + ticker
TradingView chart for that stock
About company (admin editable)
Market Cap (admin editable)
52W High (admin editable)
52W Low (admin editable)
P/E Ratio (admin editable)
Why Invest section (admin editable)
Historical returns (admin editable)
Investment calculator inline
Investment plan table
[Buy Now / Invest] button
User Flow
Stock picker grid (10 stocks)
Each shows live price %
User clicks stock → Research page
Sees chart, stats, calculator
Selects plan
Sees summary:
"You are about to buy shares in Apple Inc."
Deposits
Admin approves
"🎉 Shares Purchased Successfully"
Week 1 activates
Transaction timeline begins
Portfolio Display
MY HOLDINGS
Stock  Shares  Bought At  Current   P&L
AAPL   3.18    $600       $612.40   +$12.40
TSLA   2.47    $500       $489.20   -$10.80
Simulated micro price fluctuation
Projected return locked until maturity
Market Status Banner
🟢 Market Open | NYSE 09:30–16:00 EST
Shows real NYSE open/closed status
"Market opens in 14 hours" when closed

SECTION 12 — DEPOSIT SYSTEM
Universal Deposit Methods
ONE deposit library per admin
Same methods for crypto + stock + flash
No separation between investment types
Admin Deposit Library
Method Name
Type (Crypto/Bank/Mobile Money/Other)
Label
Address / Account Number
Extra Info
Icon (Cloudinary upload)
Status (Active/Inactive)

Admin can:
Add unlimited methods
Edit — updates instantly everywhere
Activate/deactivate instantly
Delete permanently
User Deposit Flow
Selects plan → proceeds to deposit
Sees all active methods from admin
Selects payment method
Address / account details + QR code
Copy button
Auto-generated reference:
NB-USR[ID]-[ASSET]-W[WEEK]
User fills:
  Amount sent
  Transaction hash / reference
  Screenshot upload (Cloudinary)
Submits → 🟡 Pending

SECTION 13 — WITHDRAWAL SYSTEM
Two Separate Balances
Available Balance → Investment earnings
Referral Balance  → Referral bonuses
Two separate withdrawal buttons
Two separate withdrawal queues in admin
KYC Withdrawal Gate
Unverified: can withdraw up to $500
            (admin editable limit)
Verified:   unlimited withdrawals
If unverified and above limit:
  "Complete KYC to withdraw above $500"
  [Complete KYC Now] button shown
Withdrawal Flow
User clicks withdraw
Enters amount
Selects payment method
Enters account details
Submits → 🟡 Pending
Admin sees in queue tagged as:
  INVESTMENT WITHDRAWAL or
  REFERRAL WITHDRAWAL
Admin approves/rejects/holds
Balance deducted on approval
Transaction logged
User notified

SECTION 14 — REFERRAL SYSTEM
How It Works
Every user gets unique referral link
User shares link
Friend registers
Friend activates Week 1
Bonus credited to referral balance
Referral Bonus Structure
$200 plan → $20 bonus
$300 plan → $30 bonus
$400 plan → $40 bonus
$500 plan → $50 bonus
$600 plan → $60 bonus
$700 plan → $70 bonus
$800 plan → $80 bonus
$1,000 plan → $100 bonus
Triggered after Week 1 approval
Separate referral balance
Referral Dashboard
Referral link + copy + share
Total referred / active / earned
Referral history table
Referral balance
[Withdraw Referral Bonus] button

SECTION 15 — TRANSACTION HISTORY
Universal Transaction Log
Every financial event logged:
💰 Weekly Deposit
✅ Deposit Approved
❌ Deposit Rejected
📈 Investment Activated
⏸️ Investment Paused
▶️ Investment Resumed
🔒 Investment Frozen
🗑️ Investment Deleted
🎯 Investment Matured
⚡ Flash Activated
⚡ Flash Matured
👥 Referral Bonus
💸 Investment Withdrawal
💸 Referral Withdrawal
✅ Withdrawal Approved
❌ Withdrawal Rejected
➕ Manual Credit
➖ Manual Deduction
🪪 KYC Approved
🪪 KYC Rejected
User View
Filter: [All][Deposits][Withdrawals]
        [Referrals][Manual][KYC]
Date | Type | Amount | Status
Chronological
Full history
Transaction timeline view option

SECTION 16 — SUPPORT SYSTEM
Ticket-Based Real-Time Chat
NO AI — real human admin replies only
User Side
Open ticket: Subject + Category + Message
Unique ID: #TKT-00423
Inbox: Open / In Progress / Resolved
Real-time chat thread per ticket
Notification on admin reply
Admin Side
Support inbox
Unread badge count
Real-time reply
Status management
Open/In Progress/Resolved/Closed
Scoped to own users (sub-admin)

SECTION 17 — TESTIMONIAL TOASTS
200 preset notifications database
Bottom left floating toast
Slides in from left
5–7 seconds visible
Random rotation
8–15 second intervals
Active from landing page load
Admin on/off control
Admin editable database
Admin interval speed control
Never overlaps support widget

SECTION 18 — COMPANY INFO PAGE
Company overview (admin editable)
Company stats (admin editable)
Leadership team cards:
  Photo (Cloudinary)
  Name, position, location
  Previous companies
  Education
  Personal quote
  LinkedIn link
  Display order
  Show/hide toggle
Company values section
Office locations section

SECTION 19 — CONTENT MANAGEMENT
FAQ — admin editable
  Categories, reorder, show/hide

Terms & Conditions
  Full professional document
  Rich text editor
  Version history
  Publish/unpublish

Privacy Policy
  Full professional document
  Same admin controls

Investment Calculator
  Admin editable return values
  Matches actual plan tiers

SECTION 20 — ADMIN SYSTEM

SUPER ADMIN
Creation
Register on platform normally
Manually set role: "superadmin"
in Firebase Console Firestore
One time setup — only you
Nobody else can create super admin
Super Admin Dashboard
Platform-wide analytics:
Total Users (all admins)
Total Deposited (platform wide)
Total Withdrawn (platform wide)
Active Plans (all admins)
KYC pending count
Open support tickets count

Sub-admin breakdown table:
Admin | Users | Deposits | Withdrawals | Status

Charts:
Daily deposits vs withdrawals
Active users over time
Plan distribution pie chart
Investment type breakdown
Super Admin Powers
✅ Create/edit/suspend/delete sub-admins
✅ Generate sub-admin onboarding links
✅ See ALL users across ALL admins
✅ See ALL transactions platform-wide
✅ Override any sub-admin action
✅ Edit any admin's deposit methods
✅ Edit any admin's flash plan
✅ Edit any admin's coins and stocks
✅ Edit any admin's investment plans
✅ Edit FAQ/Terms/Privacy
✅ Manage testimonial notifications
✅ Edit company info and team
✅ Platform-wide analytics
✅ Global referral program control
✅ KYC review for all users
✅ Announcement center — all users
✅ Set KYC withdrawal limits globally

SUB-ADMIN
Creation
Super admin fills name + email
System auto-generates:
  Password
  Unique adminId (JAMES-X7K2P)
  Unique onboarding link:
  [platform].com/join/JAMES-X7K2P
  Default flash plan settings
  Empty deposit method library
  Empty coin library
  Empty stock library

Credentials + link shown to super admin
Sub-admin logs in
System reads role → scoped portal
Sub-Admin Full Powers (Own Users Only)
DEPOSITS
✅ See/approve/reject pending deposits
✅ View payment proof
✅ Manually mark deposit as paid

WITHDRAWALS
✅ See/approve/reject/hold withdrawals
✅ Investment vs referral type visible

INVESTMENT PLANS
✅ Activate/freeze/unfreeze/delete plans
✅ Force complete plans
✅ Extend duration
✅ Edit projected return
✅ Mark weeks as paid manually

BALANCE
✅ Increase/decrease available balance
✅ Credit/deduct referral balance

USERS
✅ View/suspend/reactivate users
✅ View transaction history
✅ View referral breakdown
✅ Add notes to profiles

KYC
✅ Review own users' KYC submissions
✅ Approve/reject/request more docs
✅ Set KYC withdrawal limit for own users

DEPOSIT METHODS
✅ Add/edit/delete own methods
✅ Own users see only own methods

SUPPORT
✅ Own users' tickets only
✅ Real-time reply
✅ Status management

REFERRALS
✅ View/credit referral bonuses
✅ Approve referral withdrawals

FLASH PLAN
✅ Edit own duration + tiers
✅ Add/delete tiers
✅ Turn on/off

CRYPTO
✅ Add/edit/delete own coins
✅ Edit names, tickers, plans

STOCKS
✅ Add/edit/delete own stocks
✅ Edit names, tickers, research pages
✅ Edit investment plan tiers

ANNOUNCEMENTS
✅ Send announcements to own users only

ANALYTICS
✅ Own users' data only

CANNOT DO
❌ See other sub-admins' anything
❌ Platform-wide analytics
❌ Create sub-admins
❌ Edit FAQ/Terms/Privacy
❌ Edit testimonial notifications
❌ Super admin settings

ADMIN PORTAL FULL MENU
📊 Dashboard Overview

👥 USER MANAGEMENT
   └── All Users
   └── User Profiles
   └── Transaction History
   └── Referral Breakdown
   └── Investment Overview
   └── KYC Status

💰 DEPOSITS QUEUE
   └── Pending
   └── Approved History
   └── Rejected History

📤 WITHDRAWALS QUEUE
   └── Pending
   └── Approved History
   └── Rejected History

📊 TRANSACTION HISTORY
   └── All Transactions
   └── Filter by Type

⚡ FLASH PLAN SETTINGS
   └── Duration Editor
   └── Tier Editor
   └── On/Off Toggle

₿ CRYPTO MANAGEMENT
   └── Manage Coins
   └── Edit Coin Plans

📈 STOCK MANAGEMENT
   └── Manage Stocks
   └── Edit Stock Plans
   └── Edit Research Pages

💳 DEPOSIT METHODS
   └── Manage Addresses

🪪 KYC REVIEW
   └── Pending Reviews
   └── Approved
   └── Rejected

💬 SUPPORT TICKETS
   └── Open Tickets
   └── In Progress
   └── Resolved

📢 ANNOUNCEMENTS
   └── Create Announcement
   └── Published
   └── Drafts

👥 REFERRAL MANAGEMENT
   └── Overview
   └── Per User Breakdown

📊 ANALYTICS
   └── Overview Charts
   └── Deposit/Withdrawal Charts
   └── Plan Distribution
   └── User Growth

[SUPER ADMIN ONLY]
👮 ADMIN MANAGEMENT
   └── Create Sub-Admin
   └── Manage Sub-Admins
   └── Onboarding Links

🔔 TESTIMONIAL NOTIFICATIONS
   └── Manage Database
   └── Settings

🏛️ COMPANY INFO
   └── Team Members
   └── Office Locations
   └── Company Overview

📝 CONTENT MANAGEMENT
   └── FAQ Editor
   └── Terms Editor
   └── Privacy Editor

⚙️ PLATFORM SETTINGS
   └── KYC Withdrawal Limits
   └── Referral Bonus Amounts
   └── Platform Name/Logo
   └── Maintenance Mode

SECTION 21 — ROLE SYSTEM
Firebase Implementation
javascriptusers: {
  userId: string,
  name: string,
  email: string,
  phone: string,
  country: string,
  role: "superadmin" | "sub-admin" | "user",
  adminId: string,
  referralCode: string,
  referredBy: string,
  availableBalance: number,
  referralBalance: number,
  kycStatus: "unverified"|"pending"|"verified"|"rejected",
  kycDocuments: {
    idFront: string,      // Cloudinary URL
    idBack: string,       // Cloudinary URL
    selfie: string,       // Cloudinary URL
    proofOfAddress: string // Cloudinary URL
  },
  status: "active" | "suspended",
  createdAt: timestamp,
  lastLogin: timestamp
}

// Role routing on login
superadmin → /superadmin/dashboard
sub-admin  → /admin/dashboard
user       → /dashboard

SECTION 22 — INVESTMENT STATUS STATES
🟡 Pending      Deposit awaiting approval
🟢 Active       Running normally
🟠 Paused       Missed weekly deposit
🔵 Frozen       Admin froze manually
🔴 Deleted      Admin removed permanently
✅ Completed    Full return credited
⚡ Flash Active  Countdown running
⚡ Flash Done    Profit credited
🪪 KYC Pending  Documents under review
🪪 KYC Verified Full access unlocked
🪪 KYC Rejected Resubmission required

SECTION 23 — DATA ISOLATION
Every document scoped by adminId:
Deposit methods, Coins, Stocks
Flash settings, Flash tiers
Coin plan tiers, Stock plan tiers
Support tickets, KYC documents
Announcements, User accounts

Firebase security rules enforce isolation
Sub-admins cannot access outside adminId
Super admin has no restriction

SECTION 24 — CLOUDINARY INTEGRATION
All media uploads via Cloudinary:
Team photos, company logo
Payment proof screenshots
Deposit method icons
Stock/coin logos
KYC documents (ID, selfie, proof of address)

Direct browser upload
No backend needed
Returns secure_url
URL saved to Firestore
Free tier: 25GB storage + bandwidth

FINAL COMPLETE FEATURE CHECKLIST
LANDING PAGE
✅ Animated ticker banner
✅ Hero with dual CTA
✅ Trust stats counters
✅ Dual broker showcase
✅ Public investment plans table
✅ Investment calculator (interactive)
✅ How it works
✅ Why choose us
✅ Testimonials carousel
✅ Live activity feed
✅ FAQ with categories
✅ Final CTA section
✅ Professional footer
✅ Fixed navigation bar

AUTHENTICATION
✅ Registration with referral/adminId
✅ Role-based login routing
✅ Forgot password
✅ First-time onboarding screen
✅ Terms checkbox

USER DASHBOARD
✅ Crypto/Stock toggle
✅ Glassmorphism card style
✅ Collapsible sidebar
✅ Full notification center
✅ Announcement banner
✅ Unified wallet display
✅ TradingView charts
✅ Active investments overview
✅ Transaction timelines per plan
✅ Multiple simultaneous plans
✅ Live countdown timers
✅ Progress bars

EARNINGS STATISTICS
✅ Total earnings summary cards
✅ Monthly earnings chart
✅ Per asset breakdown
✅ Completed plans history
✅ Best return, average rate

KYC VERIFICATION
✅ Multi-step KYC flow
✅ Document upload via Cloudinary
✅ KYC status on dashboard
✅ Withdrawal limit for unverified
✅ Admin KYC review panel
✅ Approve/reject/request more
✅ KYC logged in transactions

ANNOUNCEMENT CENTER
✅ Admin creates announcements
✅ Target all or specific users
✅ Schedule or send immediately
✅ Dashboard banner for users
✅ Notification bell integration
✅ Sub-admin announces to own users

NOTIFICATION CENTER
✅ Bell icon with unread badge
✅ Dropdown notification panel
✅ Full notifications page
✅ Filter by type
✅ Mark read/delete
✅ All notification types covered

FLASH INVESTMENT
✅ Plan table with tiers
✅ One-time deposit
✅ Live countdown timer
✅ Maturity payout only
✅ Upsell to weekly plans
✅ Multiple simultaneous plans
✅ Fully editable per admin
✅ Transaction timeline

CRYPTO INVESTMENT
✅ Coin picker grid
✅ Live prices
✅ Per-coin investment plans
✅ Investment calculator inline
✅ Weekly deposit engine
✅ Auto-pause on missed week
✅ Maturity payout only
✅ Transaction timeline per plan
✅ Per-admin coin library

STOCK INVESTMENT
✅ Stock picker grid
✅ Research page per stock
✅ TradingView per stock
✅ Market open/closed banner
✅ Share purchase confirmation
✅ Portfolio holdings display
✅ Investment calculator inline
✅ Weekly deposit engine
✅ Auto-pause on missed week
✅ Maturity payout only
✅ Transaction timeline per plan
✅ Per-admin stock library

DEPOSIT SYSTEM
✅ Universal methods
✅ Per-admin library
✅ QR code + copy
✅ Cloudinary proof upload
✅ Auto reference numbers
✅ Pending approval flow

WITHDRAWAL SYSTEM
✅ Two separate balances
✅ Two withdrawal buttons
✅ KYC withdrawal gate
✅ Tagged withdrawal types
✅ Admin approval queue
✅ Full transaction log

REFERRAL SYSTEM
✅ Unique referral links
✅ Fixed bonus per tier
✅ Separate referral balance
✅ Referral dashboard
✅ Referral withdrawal
✅ Admin referral controls

TRANSACTION HISTORY
✅ Universal log all event types
✅ KYC events logged
✅ Filter by type
✅ Admin per-user view
✅ Full audit trail

SUPPORT SYSTEM
✅ Ticket-based no AI
✅ Real-time chat
✅ Unique ticket IDs
✅ Status management
✅ Scoped to admin's users

TESTIMONIAL TOASTS
✅ 200 preset database
✅ Bottom left toast
✅ Random rotation
✅ Admin controls

COMPANY INFO
✅ Team cards with photos
✅ Prior work + education
✅ Company values
✅ Office locations
✅ All admin editable

CONTENT MANAGEMENT
✅ FAQ editable
✅ Terms full document
✅ Privacy full document
✅ Rich text editor

SUPER ADMIN PORTAL
✅ Platform-wide dashboard
✅ All users all admins
✅ All transactions
✅ Sub-admin creation
✅ Onboarding link generation
✅ Global KYC controls
✅ Testimonial management
✅ Company info management
✅ FAQ/Terms/Privacy
✅ Platform settings
✅ Announcement center all users
✅ Analytics charts

SUB-ADMIN PORTAL
✅ Scoped to own users
✅ Own deposit methods
✅ Own flash plan settings
✅ Own coins + plans
✅ Own stocks + plans
✅ Deposits queue
✅ Withdrawals queue
✅ KYC review own users
✅ Investment controls
✅ Balance management
✅ User management
✅ Support inbox
✅ Referral management
✅ Announcements own users
✅ Own analytics

TECHNICAL
✅ React SPA
✅ Firebase Auth + Firestore
✅ Cloudinary all media
✅ TradingView widgets
✅ adminId data isolation
✅ Role-based routing
✅ Firebase security rules
✅ Real-time Firestore listeners
✅ Glassmorphism UI
✅ Collapsible sidebar
✅ Full notification system
✅ Mobile fully responsive
✅ Dark luxury gold theme
✅ Premium typography
✅ Smooth animations
✅ Investment calculator
✅ Transaction timelines
✅ Earnings statistics
✅ KYC document management
✅ Announcement system

This is the complete V2 master prompt — every single feature, flow, rule, and technical detail fully integrated including all new additions from the screenshots.
