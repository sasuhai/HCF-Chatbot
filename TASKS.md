# HCF Chatbot Task List

This document tracks the ongoing development and enhancements for the Hidayah Centre Foundation (HCF) Chatbot.

## ✅ Completed Tasks

### 📊 Analytics & Insights
- [x] **Automatic Keyword Filtering**: Implemented English & Malay stopword list to clean up word clouds.
- [x] **Manual Keyword Exclusion**: Admins can now click words in the analytics to hide them instantly.
- [x] **Restorable Exclusions**: Created a dedicated UI for managing and restoring hidden words.
- [x] **Semantic Question Grouping**: Integrated GPT-powered grouping of similar user questions.
- [x] **System Stats**: Added server runtime monitoring (Memory, Uptime, Platform).

### 🎯 Smart Lead Capture
- [x] **Lead Extraction**: Built background regex utility to find Names, Emails, and MY Phone Numbers.
- [x] **DB Linkage**: Updated schema to associate captured leads with their specific chat session.
- [x] **Leads Dashboard**: New tab in Admin panel specifically for viewing and deleting leads.
- [x] **Conversation context**: Added "View Chat" feature to see the exact transcript for any lead.
- [x] **Timestamp Polish**: Updated lead list to show both Date and Time of capture.

### 🚀 Deployment & Integrity
- [x] **Standalone Build Support**: Configured `next.config.mjs` for optimized Hostinger packaging.
- [x] **Refined Deploy Script**: Added absolute path handling, cache clearing, and Node process management.
- [x] **Hostinger Logging**: Redirected stderr to stdout for better visibility on Hostinger logs.
- [x] **Production Backup**: Integrated GitHub backup sync into the deployment workflow.

## ⏳ Priority - Pending

### 🛡️ Knowledge Management
- [ ] **Recursive Sitemap Ingestion**: Polish the crawler for extremely large websites.
- [ ] **Document Previewer**: Improve the scrolling behavior of the document viewer in the admin panel.

### 🎨 UI/UX Improvements
- [ ] **Leads Search/Filter**: Add search capability to the Captured Leads table.
- [ ] **Chat Widget Responsiveness**: Adjust for 13" laptop screens (ensuring it doesn't overlap content).

### ⚙️ Performance & Scalability
- [ ] **Analytics Caching**: Implement caching for word cloud calculations to handle thousands of messages.
- [ ] **LLM Lead Extraction**: (Optional) Switch from regex to LLM for complex lead discovery.

---
*Last updated: March 7, 2026*
