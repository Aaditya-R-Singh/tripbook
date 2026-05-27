import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = authHeader.slice(7)
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user?.email) {
    return NextResponse.json({ error: "उपयोगकर्ता नहीं मिला" }, { status: 401 })
  }

  const { name, businessName, city } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: "अपना नाम डालें" }, { status: 400 })
  }

  const phone = user.email.replace("@tripbook.app", "")
  const admin = createClient(supabaseUrl, serviceRoleKey)

  const { error } = await admin.from("owners").insert({
    id: user.id,
    name: name.trim(),
    phone,
    business_name: businessName?.trim() || null,
    city: city?.trim() || null,
  })

  if (error) {
    if (error.message?.includes("city")) {
      const { error: retryError } = await admin.from("owners").insert({
        id: user.id,
        name: name.trim(),
        phone,
        business_name: businessName?.trim() || null,
      })
      if (retryError) {
        return NextResponse.json({ error: retryError.message }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  await admin.auth.admin.updateUserById(user.id, { user_metadata: { phone } })

  return NextResponse.json({ success: true })
}
