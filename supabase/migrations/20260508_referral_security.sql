-- Migration: Referral System Security & Fraud Prevention
-- Objects: Constraints and Validation Rules

-- 1. Prevent Self-Referral at DB Level
-- Ensures a customer cannot use a code they own
ALTER TABLE referral_transactions 
ADD CONSTRAINT no_self_referral 
CHECK (code NOT IN (SELECT code FROM referral_codes WHERE customer_id = new_customer_id));

-- 2. One-Time Referral per Customer
-- Ensures a new customer can only be referred once
ALTER TABLE referral_transactions 
ADD CONSTRAINT unique_referral_per_customer 
UNIQUE (new_customer_id);

-- 3. Rate Limiting Referrals
-- Limit total referrals per code to prevent "viral" fraud
ALTER TABLE referral_codes 
ADD COLUMN IF NOT EXISTS max_referrals INT DEFAULT 50;

ALTER TABLE referral_codes 
ADD CONSTRAINT referral_cap 
CHECK (total_referrals <= max_referrals);
