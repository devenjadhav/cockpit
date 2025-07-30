-- Sample test data for Airtable tables
-- Copy and paste this data into your Airtable base

-- EVENTS TABLE DATA
-- Replace "your.email@example.com" with YOUR actual email address

-- Event 1: AI Hackathon 2024
Name: AI Hackathon 2024
Description: 48-hour hackathon focused on AI and machine learning solutions. Build innovative AI apps, meet fellow developers, and compete for amazing prizes!
Email: your.email@example.com
Start Date: 2024-02-15 09:00 AM
End Date: 2024-02-17 06:00 PM  
Location: San Francisco, CA, USA
Max Attendees: 100
Registration Deadline: 2024-02-10 11:59 PM
Status: published
Tags: AI, Machine Learning, Hackathon, Innovation
Website: https://example.com/ai-hackathon
Contact Info: help@aihackathon.com

-- Event 2: Web3 Developer Summit  
Name: Web3 Developer Summit
Description: One-day summit for Web3 developers and blockchain enthusiasts. Learn about the latest in DeFi, NFTs, and decentralized applications.
Email: your.email@example.com
Start Date: 2024-03-01 10:00 AM
End Date: 2024-03-01 05:00 PM
Location: Berlin, Germany
Max Attendees: 150  
Registration Deadline: 2024-02-25 11:59 PM
Status: draft
Tags: Web3, Blockchain, Cryptocurrency, DeFi
Website: https://example.com/web3-summit
Contact Info: info@web3summit.com

-- Event 3: Mobile App Challenge (Past Event)
Name: Mobile App Challenge 2024
Description: Weekend challenge to build innovative mobile applications. Focus on user experience and creative solutions.
Email: your.email@example.com
Start Date: 2024-01-20 09:00 AM
End Date: 2024-01-21 06:00 PM
Location: Toronto, Canada
Max Attendees: 80
Status: completed
Tags: Mobile, iOS, Android, UX
Website: https://example.com/mobile-challenge

-- Event 4: Startup Pitch Night
Name: Startup Pitch Night
Description: An evening of startup pitches and networking. Perfect for entrepreneurs looking to showcase their ideas.
Email: your.email@example.com  
Start Date: 2024-02-28 07:00 PM
End Date: 2024-02-28 10:00 PM
Location: London, UK
Max Attendees: 50
Registration Deadline: 2024-02-25 11:59 PM
Status: published
Tags: Startup, Pitch, Networking, Entrepreneurship

-- ATTENDEES TABLE DATA
-- Note: Use the actual record IDs from your Events table for "Event ID"

-- For AI Hackathon (replace recXXXXXXXXXXXXXX with actual Event record ID)
Event ID: recXXXXXXXXXXXXXX
First Name: John
Last Name: Doe
Email: john.doe@example.com
Phone: +1-555-0123
Company: TechCorp Inc
Job Title: Software Engineer
Registration Date: 2024-01-15 02:30 PM
Status: registered

Event ID: recXXXXXXXXXXXXXX  
First Name: Jane
Last Name: Smith
Email: jane.smith@startup.com
Phone: +1-555-0456
Company: StartupXYZ
Job Title: Product Manager
Dietary Restrictions: Vegetarian, no nuts
Registration Date: 2024-01-16 09:15 AM
Status: registered

Event ID: recXXXXXXXXXXXXXX
First Name: Michael
Last Name: Chen
Email: m.chen@university.edu
Company: Stanford University
Job Title: Graduate Student  
Registration Date: 2024-01-18 04:45 PM
Status: checked-in

-- For Web3 Summit (replace recYYYYYYYYYYYYYY with actual Event record ID)
Event ID: recYYYYYYYYYYYYYY
First Name: Alex
Last Name: Johnson
Email: alex.j@blockchain.com
Phone: +49-123-456789
Company: CryptoLabs
Job Title: Blockchain Developer
Registration Date: 2024-02-01 11:00 AM
Status: registered

Event ID: recYYYYYYYYYYYYYY
First Name: Sarah
Last Name: Wilson  
Email: sarah.w@defi.io
Company: DeFi Protocol
Job Title: Smart Contract Engineer
Dietary Restrictions: Vegan
Registration Date: 2024-02-03 03:20 PM
Status: registered

-- For Mobile Challenge (replace recZZZZZZZZZZZZZZ with actual Event record ID)  
Event ID: recZZZZZZZZZZZZZZ
First Name: David
Last Name: Kim
Email: david.kim@mobile.dev
Company: AppWorks
Job Title: Mobile Developer
Registration Date: 2024-01-10 10:30 AM
Status: checked-in

Event ID: recZZZZZZZZZZZZZZ
First Name: Lisa
Last Name: Rodriguez
Email: lisa.r@design.studio
Company: UX Studio
Job Title: UX Designer
Registration Date: 2024-01-12 01:15 PM  
Status: no-show
Notes: Cancelled last minute due to illness

-- Quick Setup Instructions:
-- 1. Create the Events table first
-- 2. Add the 4 sample events above (change email to yours!)
-- 3. Note down the record IDs for each event (they look like recXXXXXXXXXXXXXX)
-- 4. Create the Attendees table
-- 5. Add the sample attendees, replacing recXXX with your actual Event record IDs
-- 6. Test the login flow with your email address
