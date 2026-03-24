CREATE TABLE "attendance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"photo_url" text,
	"method" text DEFAULT 'face',
	"context" text DEFAULT 'attendance',
	"is_infringement" text,
	"infringement_reason" text
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"registration_number" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "contract_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"previous_employee_type_id" integer,
	"new_employee_type_id" integer,
	"previous_end_date" text,
	"new_end_date" text,
	"reason" text,
	"performed_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "departments_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "employee_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"leave_label" text DEFAULT 'Leave' NOT NULL,
	"has_leave_entitlement" text DEFAULT 'yes' NOT NULL,
	"is_default" text DEFAULT 'no' NOT NULL,
	"is_permanent" text DEFAULT 'yes' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employee_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "face_descriptors" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"descriptor" text NOT NULL,
	"photo_data" text,
	"label" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grievances" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_employee_id" text,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"priority" text DEFAULT 'normal',
	"attachments" text[],
	"admin_notes" text,
	"resolution" text,
	"assigned_to" text,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"leave_type" text NOT NULL,
	"total" real DEFAULT 0 NOT NULL,
	"taken" real DEFAULT 0 NOT NULL,
	"pending" real DEFAULT 0 NOT NULL,
	"carry_over_days" real DEFAULT 0 NOT NULL,
	"carry_over_expiry" text
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"leave_type" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"reason" text NOT NULL,
	"comments" text,
	"status" text DEFAULT 'pending_manager' NOT NULL,
	"admin_notes" text,
	"documents" text[],
	"manager_approver_id" text,
	"manager_decision" text,
	"manager_notes" text,
	"manager_decision_at" timestamp,
	"hr_approver_id" text,
	"hr_decision" text,
	"hr_notes" text,
	"hr_decision_at" timestamp,
	"md_approver_id" text,
	"md_decision" text,
	"md_notes" text,
	"md_decision_at" timestamp,
	"finalized_by_id" text,
	"finalized_at" timestamp,
	"is_historic" boolean DEFAULT false NOT NULL,
	"authorized_by" text,
	"reference_number" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_rule_phases" (
	"id" serial PRIMARY KEY NOT NULL,
	"leave_rule_id" integer NOT NULL,
	"sequence" integer DEFAULT 1 NOT NULL,
	"phase_name" text NOT NULL,
	"starts_after_months" integer DEFAULT 0,
	"starts_after_days_worked" integer,
	"accrual_type" text DEFAULT 'per_days_worked' NOT NULL,
	"days_earned" text DEFAULT '1' NOT NULL,
	"period_days_worked" integer DEFAULT 26,
	"cycle_months" integer,
	"max_balance_days" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"leave_type" text NOT NULL,
	"employee_type_id" integer,
	"accrual_type" text DEFAULT 'per_days_worked' NOT NULL,
	"days_earned" text DEFAULT '1' NOT NULL,
	"period_days_worked" integer DEFAULT 26,
	"accrual_rate" text DEFAULT '0' NOT NULL,
	"max_accrual" integer,
	"carry_over_limit" integer,
	"waiting_period_days" integer DEFAULT 0,
	"cycle_months" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"related_id" integer,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"department" text,
	"parent_position_id" integer,
	"sort_order" integer DEFAULT 0,
	"is_outsourced" boolean DEFAULT false,
	"tier" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"email" text NOT NULL,
	"expiry" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "public_holidays" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"date" text NOT NULL,
	"is_recurring" boolean DEFAULT false,
	"type" text DEFAULT 'public',
	"religion_group" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "user_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"first_name" text NOT NULL,
	"surname" text NOT NULL,
	"nickname" text,
	"email" text,
	"password" text,
	"mobile" text,
	"home_address" text,
	"gender" text,
	"religion" text,
	"role" text DEFAULT 'worker' NOT NULL,
	"admin_role" text,
	"has_full_admin_access" text,
	"department" text,
	"user_group_id" integer,
	"employee_type_id" integer,
	"national_id" text,
	"tax_number" text,
	"next_of_kin" text,
	"emergency_number" text,
	"popia_waiver_url" text,
	"start_date" text,
	"contract_end_date" text,
	"termination_date" text,
	"manager_id" text,
	"second_manager_id" text,
	"org_position_id" integer,
	"reports_to_position_id" integer,
	"company_id" integer,
	"photo_url" text,
	"face_descriptor" text,
	"exclude" boolean DEFAULT false,
	"exclude_from_leave" boolean DEFAULT false,
	"attendance_required" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_history" ADD CONSTRAINT "contract_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_history" ADD CONSTRAINT "contract_history_previous_employee_type_id_employee_types_id_fk" FOREIGN KEY ("previous_employee_type_id") REFERENCES "public"."employee_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_history" ADD CONSTRAINT "contract_history_new_employee_type_id_employee_types_id_fk" FOREIGN KEY ("new_employee_type_id") REFERENCES "public"."employee_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_history" ADD CONSTRAINT "contract_history_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "face_descriptors" ADD CONSTRAINT "face_descriptors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievances" ADD CONSTRAINT "grievances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievances" ADD CONSTRAINT "grievances_target_employee_id_users_id_fk" FOREIGN KEY ("target_employee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievances" ADD CONSTRAINT "grievances_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_rule_phases" ADD CONSTRAINT "leave_rule_phases_leave_rule_id_leave_rules_id_fk" FOREIGN KEY ("leave_rule_id") REFERENCES "public"."leave_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_rules" ADD CONSTRAINT "leave_rules_employee_type_id_employee_types_id_fk" FOREIGN KEY ("employee_type_id") REFERENCES "public"."employee_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_user_group_id_user_groups_id_fk" FOREIGN KEY ("user_group_id") REFERENCES "public"."user_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_employee_type_id_employee_types_id_fk" FOREIGN KEY ("employee_type_id") REFERENCES "public"."employee_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;