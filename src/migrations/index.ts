import * as migration_20260731_221500_split_dress_availability from './20260731_221500_split_dress_availability'
import * as migration_20260731_224500_add_dress_business_validation from './20260731_224500_add_dress_business_validation'
import * as migration_20260801_154500_add_catalogue_display_order from './20260801_154500_add_catalogue_display_order'
import * as migration_20260801_210000_create_booking_settings from './20260801_210000_create_booking_settings'
import * as migration_20260809_101500_add_undecided_booking_intent from './20260809_101500_add_undecided_booking_intent'
import * as migration_20260809_160000_add_privacy_records from './20260809_160000_add_privacy_records'
import * as migration_20260809_210000_formalize_appointment_lifecycle from './20260809_210000_formalize_appointment_lifecycle'
import * as migration_20260809_220000_enforce_stripe_hold_minimum from './20260809_220000_enforce_stripe_hold_minimum'

export const migrations = [
  {
    up: migration_20260731_221500_split_dress_availability.up,
    down: migration_20260731_221500_split_dress_availability.down,
    name: '20260731_221500_split_dress_availability',
  },
  {
    up: migration_20260731_224500_add_dress_business_validation.up,
    down: migration_20260731_224500_add_dress_business_validation.down,
    name: '20260731_224500_add_dress_business_validation',
  },
  {
    up: migration_20260801_154500_add_catalogue_display_order.up,
    down: migration_20260801_154500_add_catalogue_display_order.down,
    name: '20260801_154500_add_catalogue_display_order',
  },
  {
    up: migration_20260801_210000_create_booking_settings.up,
    down: migration_20260801_210000_create_booking_settings.down,
    name: '20260801_210000_create_booking_settings',
  },
  {
    up: migration_20260809_101500_add_undecided_booking_intent.up,
    down: migration_20260809_101500_add_undecided_booking_intent.down,
    name: '20260809_101500_add_undecided_booking_intent',
  },
  {
    up: migration_20260809_160000_add_privacy_records.up,
    down: migration_20260809_160000_add_privacy_records.down,
    name: '20260809_160000_add_privacy_records',
  },
  {
    up: migration_20260809_210000_formalize_appointment_lifecycle.up,
    down: migration_20260809_210000_formalize_appointment_lifecycle.down,
    name: '20260809_210000_formalize_appointment_lifecycle',
  },
  {
    up: migration_20260809_220000_enforce_stripe_hold_minimum.up,
    down: migration_20260809_220000_enforce_stripe_hold_minimum.down,
    name: '20260809_220000_enforce_stripe_hold_minimum',
  },
]
