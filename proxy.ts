import { createServerClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
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

  // If no session, redirect to login
  if (!session) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Extract phone from email: {phone}@tripbook.app
  const phone = session.user.email?.split("@")[0]

  // Check if owner exists in owners table
  const { data: owner } = await supabase
    .from("owners")
    .select("id")
    .eq("phone", phone)
    .single()

  // If owner record deleted from database, force logout
  if (!owner) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL("/?error=account_deleted", request.url))
  }

  return res
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
