import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No auth token" }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError) {
      return NextResponse.json({ error: `Auth error: ${authError.message}` }, { status: 401 })
    }
    if (!user?.email) {
      return NextResponse.json({ error: "No email in token" }, { status: 401 })
    }

    const { name, businessName, city } = await req.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: "अपना नाम डालें" }, { status: 400 })
    }

    const phone = user.email.replace("@tripbook.app", "")
    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { error: insertError } = await admin.from("owners").insert({
      id: user.id,
      name: name.trim(),
      phone,
      business_name: businessName?.trim() || null,
      city: city?.trim() || null,
    })

    if (insertError) {
      if (insertError.message?.includes("city")) {
        const { error: retryError } = await admin.from("owners").insert({
          id: user.id,
          name: name.trim(),
          phone,
          business_name: businessName?.trim() || null,
        })
        if (retryError) {
          return NextResponse.json({ error: `Insert error: ${retryError.message}` }, { status: 500 })
        }
      } else {
        return NextResponse.json({ error: `Insert error: ${insertError.message}` }, { status: 500 })
      }
    }

    const { error: metaError } = await admin.auth.admin.updateUserById(user.id, { user_metadata: { phone } })
    if (metaError) {
      return NextResponse.json({ error: `Meta error: ${metaError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: `Server error: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 })
  }
}
