export type UserRole = 'customer' | 'mechanic' | 'admin';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';
export type RequestStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'en_route'
  | 'in_progress'
  | 'completed'
  | 'cancelled';
export type ProblemType =
  | 'flat_tire'
  | 'dead_battery'
  | 'engine_issue'
  | 'overheating'
  | 'towing'
  | 'sos'
  | 'other';
export type VehicleType = 'Bike' | 'Car' | 'Scooter' | 'Van';
export type MechanicType = 'Car Mechanic' | 'Bike Mechanic';

export type Profile = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  is_disabled: boolean;
  created_at: string;
};

export type MechanicProfile = {
  user_id: string;
  workshop_name: string | null;
  mechanic_type: MechanicType | null;
  specialties: string[];
  experience_years: number;
  service_radius_km: number;
  working_hours: string | null;
  is_available: boolean;
  verification_status: VerificationStatus;
  latitude: number | null;
  longitude: number | null;
  average_rating: number;
  rating_count: number;
  completed_jobs: number;
  bio: string | null;
  profiles?: Pick<Profile, 'full_name' | 'phone' | 'avatar_url'>;
};

export type AdminMechanicProfile = MechanicProfile & {
  cnic_number: string | null;
};

export type Vehicle = {
  id: string;
  customer_id: string;
  vehicle_type: VehicleType | null;
  make: string;
  model: string;
  year: number | null;
  registration_number: string | null;
  color: string | null;
  notes: string | null;
  created_at: string;
};

export function vehicleLabel(vehicle: Pick<Vehicle, 'vehicle_type' | 'make' | 'model'>): string {
  return vehicle.vehicle_type ?? `${vehicle.make} ${vehicle.model}`.trim();
}

export type VehicleDiagnostic = {
  id: string;
  vehicle_id: string;
  code: string | null;
  description: string;
  recorded_at: string;
};

export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type PaymentType = 'diagnosis_fee' | 'repair_charge';

export const FIXED_DIAGNOSIS_FEE = 300;

export type ServiceRequest = {
  id: string;
  customer_id: string;
  mechanic_id: string | null;
  vehicle_id: string | null;
  problem_type: ProblemType;
  description: string | null;
  status: RequestStatus;
  customer_lat: number | null;
  customer_lng: number | null;
  estimated_arrival_minutes: number | null;
  diagnosis: string | null;
  work_performed: string | null;
  final_cost: number | null;
  diagnosis_fee?: number | null;
  diagnosis_payment_status?: PaymentStatus;
  diagnosis_paid_at?: string | null;
  repair_charges?: number | null;
  repair_payment_status?: PaymentStatus;
  repair_paid_at?: string | null;
  dispute_flag: boolean;
  is_sos: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  profiles?: Pick<Profile, 'full_name' | 'phone' | 'avatar_url'>;
  mechanic?: Pick<Profile, 'full_name' | 'phone'>;
  vehicles?: Pick<Vehicle, 'vehicle_type' | 'make' | 'model' | 'year' | 'registration_number'>;
};

export type PaymentRecord = {
  id: string;
  request_id: string;
  customer_id: string;
  mechanic_id: string | null;
  payment_type: PaymentType;
  amount: number;
  status: PaymentStatus;
  payment_method: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  service_requests?: Pick<ServiceRequest, 'problem_type' | 'status' | 'is_sos'>;
  customer?: Pick<Profile, 'full_name' | 'phone'>;
  mechanic?: Pick<Profile, 'full_name' | 'phone'>;
};

export type MechanicLocation = {
  id: string;
  request_id: string;
  mechanic_id: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
};

export type Rating = {
  id: string;
  request_id: string;
  customer_id: string;
  mechanic_id: string;
  stars: number;
  comment: string | null;
  created_at: string;
};

export type AppNotification = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

export type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  profiles?: Pick<Profile, 'full_name' | 'phone' | 'avatar_url'>;
};

export type ServiceCategory = {
  id: ProblemType;
  label: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminActivityLog = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

export const PROBLEM_LABELS: Record<ProblemType, string> = {
  flat_tire: 'Flat tire',
  dead_battery: 'Dead battery',
  engine_issue: 'Engine issue',
  overheating: 'Overheating',
  towing: 'Towing',
  sos: 'Emergency SOS',
  other: 'Other',
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  en_route: 'En route',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
