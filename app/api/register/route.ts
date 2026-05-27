import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  const { phone, password, name, businessName, city } = await req.json()

  if (!phone?.trim() || phone.length !== 10) {
    return NextResponse.json({ error: "सही फ़ोन नंबर डालें (10 अंक)" }, { status: 400 })
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "कम से कम 6 अंक का पासवर्ड डालें" }, { status: 400 })
  }
  if (!name?.trim()) {
    return NextResponse.json({ error: "अपना नाम डालें" }, { status: 400 })
  }

  const email = `${phone}@tripbook.app`
  const admin = createClient(supabaseUrl, serviceRoleKey)

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { phone },
  })

  if (authError) {
    if (authError.message.includes("already registered")) {
      return NextResponse.json({ error: "यह फ़ोन नंबर पहले से पंजीकृत है — लॉगिन करें" }, { status: 400 })
    }
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  const { error: ownerError } = await admin.from("owners").insert({
    id: authData.user.id,
    name: name.trim(),
    phone,
    business_name: businessName?.trim() || null,
    city: city?.trim() || null,
  })

  if (ownerError) {
    if (ownerError.message?.includes("city")) {
      const { error: retryError } = await admin.from("owners").insert({
        id: authData.user.id,
        name: name.trim(),
        phone,
        business_name: businessName?.trim() || null,
      })
      if (retryError) {
        return NextResponse.json({ error: retryError.message }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: ownerError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true, email })
}
