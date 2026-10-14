INSERT INTO "page_seo" (
	"page_key",
	"pathname",
	"browser_title",
	"meta_description",
	"canonical_url",
	"breadcrumb_label",
	"include_in_sitemap",
	"sitemap_priority",
	"change_frequency",
	"schema_config"
) VALUES
	(
		'percentage-increase-calculator',
		'/percentage-increase-calculator',
		'Percentage Increase Calculator: Work Out % Change',
		'Calculate a percentage increase or decrease, find the absolute difference, or apply a percentage change to an original value.',
		'https://www.solocalculator.com/percentage-increase-calculator',
		'Percentage change',
		true, 0.8, 'monthly',
		'{"type":"WebApplication","properties":{"applicationCategory":"UtilitiesApplication"}}'::jsonb
	),
	(
		'percentage-of-calculator',
		'/percentage-of-calculator',
		'Percentage Calculator: What Percent of What Number',
		'Find a percentage of a number, what percentage one number is of another, or the whole number behind a percentage.',
		'https://www.solocalculator.com/percentage-of-calculator',
		'Percentage of',
		true, 0.8, 'monthly',
		'{"type":"WebApplication","properties":{"applicationCategory":"UtilitiesApplication"}}'::jsonb
	),
	(
		'discount-calculator',
		'/discount-calculator',
		'Discount Calculator: Sale Price and How Much You Save',
		'Calculate a sale price, amount saved, stacked discount rate, or the discount between an original and final price.',
		'https://www.solocalculator.com/discount-calculator',
		'Discount',
		true, 0.8, 'monthly',
		'{"type":"WebApplication","properties":{"applicationCategory":"UtilitiesApplication"}}'::jsonb
	),
	(
		'time-duration-calculator',
		'/time-duration-calculator',
		'Time Duration Calculator: Hours Between Two Times',
		'Calculate hours and minutes between two times, cross midnight, include dates, and subtract an unpaid break.',
		'https://www.solocalculator.com/time-duration-calculator',
		'Time duration',
		true, 0.8, 'monthly',
		'{"type":"WebApplication","properties":{"applicationCategory":"UtilitiesApplication"}}'::jsonb
	),
	(
		'business-days-calculator',
		'/business-days-calculator',
		'Business Days Calculator: Working Days Between Dates',
		'Count working days and weekend days between dates, or add working days using Saturday-Sunday or Friday-Saturday weekends.',
		'https://www.solocalculator.com/business-days-calculator',
		'Business days',
		true, 0.8, 'monthly',
		'{"type":"WebApplication","properties":{"applicationCategory":"UtilitiesApplication"}}'::jsonb
	)
ON CONFLICT ("page_key") DO NOTHING;
