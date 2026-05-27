"use server"

import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getAdmin() {
  return createClient(supabaseUrl, serviceRoleKey)
}

export async function createOwner(_prevState: unknown, formData: FormData) {
  const name = formData.get("name") as string
  const businessName = formData.get("businessName") as string

  if (!name?.trim()) {
    return { error: "अपना नाम डालें" }
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return { error: "उपयोगकर्ता नहीं मिला" }
  }

  const phone = user.email.replace("@tripbook.app", "")

  const admin = getAdmin()
  const { error } = await admin.from("owners").insert({
    id: user.id,
    name: name.trim(),
    phone,
    business_name: businessName?.trim() || null,
  })

  if (error) {
    return { error: error.message }
  }

  const { error: metadataError } = await admin.auth.admin.updateUserById(
    user.id,
    { user_metadata: { phone } },
  )

  if (metadataError) {
    return { error: metadataError.message }
  }

  redirect("/dashboard")
}

export async function register(_prevState: unknown, formData: FormData) {
  const phone = formData.get("phone") as string
  const password = formData.get("password") as string
  const name = formData.get("name") as string
  const businessName = formData.get("businessName") as string

  if (!phone?.trim() || phone.length !== 10) {
    return { error: "सही फ़ोन नंबर डालें (10 अंक)" }
  }
  if (!password || password.length < 6) {
    return { error: "कम से कम 6 अंक का पासवर्ड डालें" }
  }
  if (!name?.trim()) {
    return { error: "अपना नाम डालें" }
  }

  const email = `${phone}@tripbook.app`
  const cookieStore = await cookies()
  const admin = getAdmin()

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { phone },
  })

  if (authError) {
    if (authError.message.includes("already registered")) {
      return { error: "यह फ़ोन नंबर पहले से पंजीकृत है — लॉगिन करें" }
    }
    return { error: authError.message }
  }

  const userSupabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      },
    },
  })

  const { error: signInError } = await userSupabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError) {
    return { error: signInError.message }
  }

  const { error: ownerError } = await admin.from("owners").insert({
    id: authData.user.id,
    name: name.trim(),
    phone,
    business_name: businessName?.trim() || null,
  })

  if (ownerError) {
    return { error: ownerError.message }
  }

  redirect("/dashboard")
}
