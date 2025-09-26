# Aulux - Digital Education Platform

A comprehensive web application designed to enhance the learning experience for underprivileged youth by integrating seamlessly with Google Classroom. Aulux empowers educators and coordinators to monitor student progress, manage assignments, and facilitate communication effectively.

## 🚀 Features

### Core Features (Implemented)
- **Main Dashboard**: Overview of classes, students, and activities
- **Class List Overview**: Manage multiple classes with detailed information
- **Google Classroom Integration**: Sync data from Google Classroom
- **Student Progress Dashboard**: Monitor student performance and progress
- **Assignment Status Tracking**: Track assignment submissions and deadlines
- **Automated Notifications**: Stay updated with real-time notifications

### Upcoming Features
- **Attendance Tracking Module**: Monitor and report attendance patterns
- **Graphical Progress Reports**: Visual representations of student progress
- **Role-Based Access Control**: Tailored experiences for different user roles
- **User Feedback Mechanism**: Collect and analyze user feedback

## 🎨 Design System

### Color Palette
- **Primary Color**: `#3B82F6` (Blue)
- **Secondary Color**: `#10B981` (Green)
- **Gray Scale**: Various shades for backgrounds and text

### Typography
- **Font Family**: Inter
- **Body Text**: 16px
- **Headings**: 24px

## 🛠️ Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Heroicons
- **Charts**: Chart.js with React Chart.js 2
- **Authentication**: NextAuth.js (ready for implementation)
- **Database**: Prisma ORM (ready for implementation)
- **API Integration**: Google APIs for Classroom integration

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Main dashboard
│   ├── classes/           # Class management pages
│   ├── progress/          # Student progress pages
│   ├── assignments/       # Assignment tracking pages
│   ├── notifications/     # Notification center
│   ├── globals.css        # Global styles
│   └── layout.tsx         # Root layout
├── components/            # Reusable components (to be added)
├── utils/                 # Utility functions (to be added)
├── api/                   # API routes (to be added)
└── context/               # Context providers (to be added)
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Semillero Digital Dashboard"
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

## 📱 User Journey Flow

1. **Main Dashboard**: Overview of classes and activities
2. **Class List Overview**: Select and manage classes
3. **Class Details**: View specific class information
4. **Google Classroom Sync**: Fetch and verify data from Google Classroom
5. **Student Progress**: Monitor individual and class performance
6. **Assignment Tracking**: Manage assignment statuses and deadlines
7. **Notifications**: Receive and manage automated notifications

## 🔧 Configuration

### Environment Variables (To be added)
Create a `.env.local` file in the root directory:

```env
# Google Classroom API
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Database
DATABASE_URL=your_database_url
```

## 🎯 Implementation Phases

### Phase 1: Core Features ✅
- [x] Project setup and configuration
- [x] Design system implementation
- [x] Main dashboard
- [x] Class list overview
- [x] Google Classroom sync interface
- [x] Student progress dashboard
- [x] Assignment status tracking
- [x] Notifications system

### Phase 2: Integrations (Next)
- [ ] Google Classroom API integration
- [ ] User authentication (NextAuth.js)
- [ ] Database integration (Prisma)
- [ ] Real-time notifications

### Phase 3: Advanced Features (Future)
- [ ] Attendance tracking
- [ ] Graphical reports
- [ ] Role-based access control
- [ ] User feedback system
- [ ] Mobile responsiveness enhancements

## 🎨 UI/UX Guidelines

- **Modern & Tech-savvy**: Clean, contemporary design
- **Accessibility**: ARIA roles, color contrast, alternative text
- **Responsive**: Mobile-first approach with Tailwind CSS
- **Intuitive Navigation**: Clear visual indicators and user flows
- **Consistent Design**: Unified color palette and typography

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Designed for educators and coordinators working with underprivileged youth
- Built with modern web technologies for optimal performance
- Focused on accessibility and user experience

---

**Aulux** - Transforming digital education for underprivileged youth through technology and innovation.
