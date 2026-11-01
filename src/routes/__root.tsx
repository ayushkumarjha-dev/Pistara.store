import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { I18nProvider } from "@/lib/i18n";
import { CartProvider } from "@/lib/cart";
import { AuthProvider } from "@/lib/auth";
import { SiteLayout } from "@/components/shop/SiteLayout";
import { Toaster } from "@/components/ui/sonner";
import { Logo } from "@/components/shop/brand";
import { Button } from "@/components/ui/button";

function NotFoundComponent() {
  return (
    <div className="grain flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="flex justify-center"><Logo /></div>
        <h1 className="mt-10 font-display text-8xl font-extrabold text-primary">404</h1>
        <h2 className="mt-4 text-2xl font-bold text-primary-deep">
          This shelf is <span className="accent-serif text-primary">empty</span>
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">The page you're looking for doesn't exist or has moved.</p>
        <Button asChild className="mt-8">
          <Link to="/shop">Back to shop</Link>
        </Button>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong on our end. You can try refreshing or head back home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Try again
          </Button>
          <Button variant="outline" asChild>
            <a href="/">Go home</a>
          </Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Pistara | Premium Dry Fruits" },
      { name: "description", content: "Premium makhana, cashews and raisins, hand-selected and hygienically packed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Montserrat:wght@500;600;700;800&family=Noto+Sans+Devanagari:wght@400;600;700&family=Playfair+Display:ital,wght@1,500;1,600&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <I18nProvider>
          <AuthProvider>
            <CartProvider>
              <SiteLayout>
                <Outlet />
              </SiteLayout>
              <Toaster position="top-center" richColors />
            </CartProvider>
          </AuthProvider>
        </I18nProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
