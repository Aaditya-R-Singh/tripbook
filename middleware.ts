import { createServerClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const { data: { session } } = await supabase.auth.getSession()
  const path = request.nextUrl.pathname

  // Not logged in — allow / and /onboarding, redirect everything else to /
  if (!session) {
    if (path === "/" || path === "/onboarding") return res
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Logged in — check owners table
  const phone = session.user.email?.split("@")[0]

  if (!phone) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL("/", request.url))
  }

  const { data: owner } = await supabase
    .from("owners")
    .select("id")
    .eq("phone", phone)
    .maybeSingle()

  // Logged in but no owner record → must onboard
  if (!owner) {
    if (path === "/onboarding") return res
    return NextResponse.redirect(new URL("/onboarding", request.url))
  }

  // Has owner but visiting onboarding → redirect to dashboard
  if (path === "/onboarding") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return res
}

export const config = {
  matcher: ["/", "/onboarding", "/dashboard/:path*"],
}
