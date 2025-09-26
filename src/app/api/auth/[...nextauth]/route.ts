import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

// Note: Using JWT sessions so a database is optional for local dev.
export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/classroom.courses.readonly',
            'https://www.googleapis.com/auth/classroom.rosters.readonly',
            'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
            'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly',
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events',
          ].join(' '),
          prompt: 'consent',
          access_type: 'offline',
          include_granted_scopes: 'true',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.access_token = account.access_token
        token.refresh_token = account.refresh_token
        token.expires_at = account.expires_at
        token.providerAccountId = account.providerAccountId
      }
      if (profile && typeof profile.name === 'string') {
        token.name = profile.name
      }

      // Map role by email strictly from env lists
      const email = token.email as string | undefined
      if (email) {
        const parseList = (v?: string) => (v ? v.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [])
        const coordinatorList = parseList(process.env.COORDINATOR_EMAILS)
        const professorList = parseList(process.env.PROFESSOR_EMAILS)
        const studentList = parseList(process.env.STUDENT_EMAILS)

        const lower = email.toLowerCase()
        let role: 'coordinador' | 'profesor' | 'alumno' = 'alumno'
        if (coordinatorList.includes(lower)) role = 'coordinador'
        else if (professorList.includes(lower)) role = 'profesor'
        else if (studentList.includes(lower)) role = 'alumno'
        ;(token as any).role = role
      }
      return token
    },
    async session({ session, token }) {
      // Expose access token to client-side for API calls to our backend only.
      if (token) {
        ;(session as any).access_token = token.access_token
        session.user = session.user || { name: token.name as string | undefined, email: undefined, image: undefined }
        ;(session.user as any).role = (token as any).role || 'alumno'
      }
      return session
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
