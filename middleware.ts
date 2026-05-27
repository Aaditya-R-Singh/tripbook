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

  // CASE 1: Not logged in — send to login
  if (!session) {
    if (path === "/" || path === "/onboarding") return res
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Extract phone from email: {phone}@tripbook.app
  const phone = session.user.email?.split("@")[0]

  // CASE 2 + 3: Logged in — check owners table
  const { data: owner } = await supabase
    .from("owners")
    .select("id")
    .eq("phone", phone)
    .single()

  // CASE 2: Logged in but no owner record
  if (!owner) {
    // Allow onboarding page
    if (path === "/onboarding") return res
    // Block everything else — send to onboarding
    return NextResponse.redirect(new URL("/onboarding", request.url))
  }

  // CASE 4: Has owner record but visiting onboarding again
  if (owner && path === "/onboarding") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // CASE 3: All good — allow access
  return res
}

export const config = {
  matcher: ["/", "/onboarding", "/dashboard/:path*"],
}
