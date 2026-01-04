import NextAuth, { AuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";

// MUST be exported for use in other routes
export const authOptions: AuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email public_repo'
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Save access token to JWT
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      // Pass access token to session
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // Enable debug mode temporarily
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
