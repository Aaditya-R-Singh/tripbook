export interface Owner {
  id: string
  name: string
  phone: string
  business_name: string | null
  created_at: string
}

export interface Truck {
  id: string
  owner_id: string
  truck_number: string
  epass_number: string | null
  epass_expiry_date: string | null
  is_active: boolean
  created_at: string
}

export interface Trip {
  id: string
  truck_id: string
  owner_id: string
  driver_name: string | null
  source_location: string | null
  destination: string | null
  material: string
  trip_start_time: string
  trip_end_time: string | null
  amount: number | null
  payment_status: string
  status: string
  created_at: string
}

export interface Payment {
  id: string
  owner_id: string
  trip_id: string
  amount: number | null
  paid_at: string
  notes: string | null
}

export interface EpassReminder {
  id: string
  truck_id: string
  sent_at: string
  message_sent: string
}

export interface Database {
  public: {
    Tables: {
      owners: {
        Row: Owner
        Insert: Omit<Owner, "id" | "created_at">
        Update: Partial<Omit<Owner, "id">>
      }
      trucks: {
        Row: Truck
        Insert: Omit<Truck, "id" | "created_at">
        Update: Partial<Omit<Truck, "id">>
      }
      trips: {
        Row: Trip
        Insert: Omit<Trip, "id" | "created_at">
        Update: Partial<Omit<Trip, "id">>
      }
      payments: {
        Row: Payment
        Insert: Omit<Payment, "id" | "paid_at">
        Update: Partial<Omit<Payment, "id">>
      }
      epass_reminders: {
        Row: EpassReminder
        Insert: Omit<EpassReminder, "id" | "sent_at">
        Update: Partial<Omit<EpassReminder, "id">>
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
