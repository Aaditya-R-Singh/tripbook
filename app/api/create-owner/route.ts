import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  const { name, businessName, city, userId, email } = await req.json()

  if (!userId || !name?.trim()) {
    return NextResponse.json({ error: "अपना नाम और यूज़र आईडी डालें" }, { status: 400 })
  }

  const phone = email?.replace("@tripbook.app", "") || userId
  const admin = createClient(supabaseUrl, serviceRoleKey)

  const { error } = await admin.from("owners").insert({
    id: userId,
    name: name.trim(),
    phone,
    business_name: businessName?.trim() || null,
    city: city?.trim() || null,
  })

  if (error) {
    if (error.message?.includes("city")) {
      const { error: retryError } = await admin.from("owners").insert({
        id: userId,
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

  await admin.auth.admin.updateUserById(userId, { user_metadata: { phone } })

  return NextResponse.json({ success: true })
}
