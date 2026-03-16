import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  console.log('Proxy intercepting:', pathname);

  // Récupérer le token de session
  const sessionToken = request.cookies.get('cineo_session_token')?.value;

  // Définition des routes protégées (Dashboard)
  const isDashboardRoute = pathname.startsWith('/dashboard');

  // Définition des routes d'authentification (Login, Register, Home)
  // Ces pages redirigent vers le dashboard si l'utilisateur est connecté
  const isAuthRoute = pathname === '/login' || pathname === '/register' || pathname === '/';

  // Routes sensibles nécessitant un contexte spécifique (ex: token dans l'URL)
  const isResetPasswordRoute = pathname.startsWith('/reset-password') || pathname.startsWith('/new-password');
  const isVerifyRoute = pathname.startsWith('/verify-pin') || pathname.startsWith('/verify-email');

  // Routes Admin
  const isAdminRoute = pathname.startsWith('/admin');


  // 1. Protection du Dashboard Utilisateur
  if (isDashboardRoute && !sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 1b. Protection du Dashboard Admin
  if (isAdminRoute && !sessionToken) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Redirection des utilisateurs connectés (User)
  if (isAuthRoute && sessionToken) {
    // Note: Idéalement, on vérifierait le rôle ici, mais on le fera côté client/serveur
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 3. Protection des formulaires sensibles (Reset Password, Verify)
  if ((isResetPasswordRoute || isVerifyRoute) && !searchParams.has('token') && !searchParams.has('code') && !searchParams.has('email')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp|js|css)).*)',
  ],
};
