## Table `funnel_questions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `question_key` | `text` |  |
| `title` | `text` |  |
| `options` | `jsonb` |  |
| `sort_order` | `int4` |  |
| `visible` | `bool` |  Nullable |
| `funnel_slug` | `text` |  |
| `id` | `uuid` | Primary |
| `question_type` | `question_type` |  |
| `config` | `jsonb` |  |

## Table `funnels`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `slug` | `text` |  Unique |
| `is_active` | `bool` |  Nullable |
| `industry` | `text` |  |
| `tenant_slug` | `text` |  |
| `funnel_title` | `text` |  Nullable |
| `submit_button_label` | `text` |  Nullable |
| `success_message` | `text` |  Nullable |
| `response_time_text` | `text` |  Nullable |
| `contact_form_subtitle` | `text` |  Nullable |
| `privacy_policy_url` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `id` | `uuid` | Primary |
| `email_sender_local` | `text` |  Nullable |
| `primary_color` | `text` |  Nullable |
| `text_color` | `text` |  Nullable |
| `background_color` | `text` |  Nullable |
| `page_background_color` | `text` |  Nullable |
| `font` | `text` |  Nullable |
| `border_radius` | `text` |  Nullable |
| `max_width` | `text` |  Nullable |

## Table `honeypot_triggers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `created_at` | `timestamptz` |  Nullable |
| `ip_address` | `text` |  Nullable |
| `funnel_slug` | `text` |  Nullable |

## Table `submissions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `contact_name` | `text` |  |
| `contact_email` | `text` |  |
| `contact_phone` | `text` |  |
| `answers` | `jsonb` |  |
| `funnel_slug` | `text` |  |
| `tenant_slug` | `text` |  |
| `lead_price` | `numeric` |  Nullable |
| `source_url` | `text` |  Nullable |
| `user_agent` | `text` |  Nullable |
| `honeypot_triggered` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `id` | `uuid` | Primary |
| `ip_address` | `text` |  Nullable |
| `contact_anrede` | `text` |  Nullable |
| `customer_email_sent` | `bool` |  Nullable |
| `tenant_email_sent` | `bool` |  Nullable |

## Table `tenants`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `slug` | `text` |  Unique |
| `company_name` | `text` |  |
| `is_active` | `bool` |  Nullable |
| `public_email` | `text` |  |
| `public_phone` | `text` |  Nullable |
| `notification_email` | `text` |  |
| `address` | `text` |  Nullable |
| `website` | `text` |  Nullable |
| `billing_model` | `text` |  |
| `lead_price_base` | `numeric` |  Nullable |
| `flat_monthly_price` | `numeric` |  Nullable |
| `flat_monthly_lead_limit` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `id` | `uuid` | Primary |

