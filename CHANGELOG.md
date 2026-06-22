# Changelog

## [0.12.0](https://github.com/useplunk/plunk/compare/v0.11.0...v0.12.0) (2026-06-21)


### Features

* add composite index on campaignId and status for efficient campaign completion checks ([4b752a5](https://github.com/useplunk/plunk/commit/4b752a527b1c4da1cd211869ac33ba124bf8aa66)), closes [#400](https://github.com/useplunk/plunk/issues/400)
* add disabledReason field to projects for better tracking of disable reasons ([94ceadb](https://github.com/useplunk/plunk/commit/94ceadbbe417f0cb3ab72c66bfad9428bdce2d11))
* **api:** allow API key authentication for domain endpoints ([d2496bc](https://github.com/useplunk/plunk/commit/d2496bc51d17657380160dbfc20e099d3f4eadba))
* bulk delete for workflows and campaigns ([a05034e](https://github.com/useplunk/plunk/commit/a05034e517d8811aa941bc6be111fa94491e881a))
* **Contacts:** add subscription status filter and enhance query capabilities ([8564016](https://github.com/useplunk/plunk/commit/85640162ce8461f76df9f125db6119f5eed26e87))
* **contacts:** make email cell a link to the contact detail page ([6759bff](https://github.com/useplunk/plunk/commit/6759bffd2a1f0bfb09b754bb0efdfe5c347ea2b3))
* **contacts:** make email cell a link to the contact detail page ([6d98d51](https://github.com/useplunk/plunk/commit/6d98d512222ffb422bc2a4bef4284a644558b39d))
* **EmailService:** add worker concurrency settings and improve email queue prioritization ([80beb2b](https://github.com/useplunk/plunk/commit/80beb2bb9937101d1723f2d54648060fdcbe6cef))
* extend table view to workflows and campaigns list pages ([e932b2d](https://github.com/useplunk/plunk/commit/e932b2dccb685e46d9a6ff82babd488a5e068e53))
* **i18n:** add Japanese (ja) translations ([e399d0c](https://github.com/useplunk/plunk/commit/e399d0c0bc24e08991c9839a0604cdff4985a995))
* **i18n:** add Japanese (ja) translations ([f34c0e1](https://github.com/useplunk/plunk/commit/f34c0e13dd1146c3310f74c49090f9db1a9ee8ec))
* implement deterministic avatar gradient generation for user accounts ([e0e79cc](https://github.com/useplunk/plunk/commit/e0e79cc8e7bce6f63e871e4630bcf6ed36a36ca0))
* introduce DataTableFilter and FacetedFilterMenu for unified filtering experience ([44e4e45](https://github.com/useplunk/plunk/commit/44e4e454c0ecde66b4881a5831def7bee82d0862))
* make detectCustomHtmlPatterns aware of TipTap's actual capabilities ([9797aed](https://github.com/useplunk/plunk/commit/9797aed47f520aba51bec4e09c9bc4b7762e02f8))
* make detectCustomHtmlPatterns aware of TipTap's actual capabilities ([ba3813e](https://github.com/useplunk/plunk/commit/ba3813e2422d9fe4e252a90242393cada65644dc))
* normalize email addresses for contacts to handle case-variants and whitespace ([05c8041](https://github.com/useplunk/plunk/commit/05c8041a312aaf1328d09ee5b31fb4dbc9ed6e6b)), closes [#403](https://github.com/useplunk/plunk/issues/403)
* refactor DashboardLayout to use DropdownMenu for project and user menus ([9cbd5c0](https://github.com/useplunk/plunk/commit/9cbd5c050eb43a123f1b9f06090aa829796c3a0a))
* render template variables in WEBHOOK step url, headers and body ([bfecf04](https://github.com/useplunk/plunk/commit/bfecf04fa38309804ee19e99b9908caf51c5e039))
* render template variables in WEBHOOK step url, headers and body ([c484da8](https://github.com/useplunk/plunk/commit/c484da88ab7b4635987868e2e3c6fdded68ade8c))
* **SecurityService:** enhance phishing detection by verifying sender domains and institutional TLDs ([6ab4d77](https://github.com/useplunk/plunk/commit/6ab4d77ca9bebd01f75d8799dad23fdec7768b52))
* **SecurityService:** enhance phishing detection by verifying sender domains and institutional TLDs ([edfc399](https://github.com/useplunk/plunk/commit/edfc399061cb7fd079b7f11167a2796df766d8ac))
* table view with sorting, faceted filters, and bulk delete  for templates, workflows, and campaigns ([4ccb3d2](https://github.com/useplunk/plunk/commit/4ccb3d20b1fcfe21f8781777154d05571f3f19c6))
* tanstack table view with sorting, faceted filter, and bulk delete for templates ([55a0c4f](https://github.com/useplunk/plunk/commit/55a0c4fe239f415b54784270365ee0a3b2b312e2))
* **tests:** enhance test database setup and cleanup for improved isolation and performance ([32dd7bb](https://github.com/useplunk/plunk/commit/32dd7bba462a6f4a13d59b8fb03708f971d1eff0))


### Bug Fixes

* coerce boolean and numeric values in custom CSV columns ([4a145f3](https://github.com/useplunk/plunk/commit/4a145f3488bee63c2d82a4a477f6dfaaaaede64b))
* **dashboard:** table empty-state recovery, bulk button sizing, workflow status+steps, header casing ([157ff34](https://github.com/useplunk/plunk/commit/157ff34486a5cd4d716cb7176f6e3e86d7109320))
* **filters:** land templates/workflows/campaigns search inputs at 32px to match filter buttons ([283f402](https://github.com/useplunk/plunk/commit/283f40239dcc81e78d35b39cb9b31f97b435b8d7))
* make email templates, campaigns and workflow search inputs same height as the rest of the app ([8b3657d](https://github.com/useplunk/plunk/commit/8b3657d056938b17f0634c0fe8d664ae1e07cd73))
* safeguard JSON data handling in contacts migration to ensure proper object types ([55a5e4d](https://github.com/useplunk/plunk/commit/55a5e4d31b666bcef65c6de118ad7564d624f2cd))


### Code Refactoring

* **database:** increase Prisma connection pool limits for improved test performance ([71e2277](https://github.com/useplunk/plunk/commit/71e227764319e6fc732aefdebd11f3e844257ef6))
* **SecurityService:** update absolute count ceilings for new projects to improve spam detection ([4de40f4](https://github.com/useplunk/plunk/commit/4de40f40fa300c9e9ed2ed35f367ca4cd601f309))


### Documentation

* add env-var sync rule to CLAUDE.md ([a348d37](https://github.com/useplunk/plunk/commit/a348d37c21ecf1d57845f31210f66a8113fadb8d))
* add new recipe pages for waitlist and sync unsubscribes ([01ec34a](https://github.com/useplunk/plunk/commit/01ec34a8cbbe0f4a158398c0eb8300d847bc29ab))
* correct PHISHING_CONFIDENCE_THRESHOLD default in CLAUDE.md ([5c16679](https://github.com/useplunk/plunk/commit/5c166797b57f2e7b714957824ee1acdcb22c05f2))
* **env:** add wiki-documented vars to apps/api/.env.example ([81315ea](https://github.com/useplunk/plunk/commit/81315eac8eb32a7d2e61617c6a84f349afaf7860))
* **env:** sync .env.self-host.example with missing variables ([1c1c95d](https://github.com/useplunk/plunk/commit/1c1c95d332fb9ab6c2f926f6d51071cfb245ed86))
* **env:** sync env example files, fix CLAUDE.md drift, add process rule ([6ebbb50](https://github.com/useplunk/plunk/commit/6ebbb50f6817f1354f26cc7734631d3b6ded32ed))
* **wiki:** document MAIL_FROM_SUBDOMAIN and NGINX_PORT env vars ([971b98a](https://github.com/useplunk/plunk/commit/971b98a4cc6145571204f5a4ad794aa3d09ea71c))

## [0.11.0](https://github.com/useplunk/plunk/compare/v0.10.0...v0.11.0) (2026-05-13)


### Features

* Ability to change subscription status in workflows ([fadc19d](https://github.com/useplunk/plunk/commit/fadc19d139084550eb442a8b8368edcd6075cad0))
* add 'notTriggeredWithin' operator to segment filters for enhanced event tracking ([0f00ca1](https://github.com/useplunk/plunk/commit/0f00ca1b8c9bd95f2158af845218ef432ab0d498))
* add external link to edit email templates in SendEmailStepDialog and WorkflowBuilder ([4ba43dd](https://github.com/useplunk/plunk/commit/4ba43dd3b64776413f813e091f527aa3e56bfc84))
* add Markdown cut link to footer and page for improved accessibility ([ccd516e](https://github.com/useplunk/plunk/commit/ccd516e4e882921fb1a8a3e87c47710e51e35311))
* add project switching functionality to command palette ([5724ab9](https://github.com/useplunk/plunk/commit/5724ab9536ea4e3bb4e916e963b1f39ba51bb7f3))
* add sanitize-html for improved email content sanitization ([735acff](https://github.com/useplunk/plunk/commit/735acff45423cb537f7aa636b9a9d31830775f93))
* add search functionality to campaigns list with debounce effect ([d114950](https://github.com/useplunk/plunk/commit/d11495061d907bcee699d56987784fa7ebe31bf6))
* add segment membership operators and enhance segment filter functionality ([a3cc622](https://github.com/useplunk/plunk/commit/a3cc62213f40f6a9341113b73b52852292fb9a10))
* add SwitchOffer component to promote switching from competitors for enhanced user engagement ([6195b39](https://github.com/useplunk/plunk/commit/6195b39f3dbdd9fe783b79f9ae7f7942509a49a0))
* add workflow duplication functionality with API endpoint and UI button ([c6340a1](https://github.com/useplunk/plunk/commit/c6340a1dc7385723d4ec30779340218935d814e6))
* enhance campaign scheduling and audience settings UI for better clarity and usability ([7658a59](https://github.com/useplunk/plunk/commit/7658a59b5df4e325ad9eca37356cad3cbb70e942))
* implement bulk contact action selector for improved flexibility in bulk operations ([de6335e](https://github.com/useplunk/plunk/commit/de6335e99999242f81e9eda9a20aeccab80a2de4))
* implement caching for recent activity count to optimize performance and reduce database load ([f22da4a](https://github.com/useplunk/plunk/commit/f22da4add1e455678f380aba8c2fd02012ef6457))
* implement early fraud warning handling in webhooks ([48425d1](https://github.com/useplunk/plunk/commit/48425d1df160a3fd5edb4cbdcc9e6725628db319))
* make MAIL FROM subdomain configurable via MAIL_FROM_SUBDOMAIN env ([463301b](https://github.com/useplunk/plunk/commit/463301b5db27b08b483db3c56a992ac62d6653b8))
* make MAIL FROM subdomain configurable via MAIL_FROM_SUBDOMAIN env var ([e0bf0f6](https://github.com/useplunk/plunk/commit/e0bf0f628af2a155ca3bbc38ef5c2f4ecc0455e6))
* refactor template editing layout for improved usability and clarity ([aaf5ac6](https://github.com/useplunk/plunk/commit/aaf5ac65307266a4d9deb02986b610757e929b49))


### Bug Fixes

* enhance campaign finalization process to handle pending emails and ensure accurate status updates ([2529c9b](https://github.com/useplunk/plunk/commit/2529c9b4282b003a94013259119e98654ae22b46))
* enhance email content parsing and logging for better debugging ([4587e9d](https://github.com/useplunk/plunk/commit/4587e9d670fa3a27fbc1ca7669c8fc75d804e85e))
* enhance project name validation to exclude invisible and decorative characters ([29883ff](https://github.com/useplunk/plunk/commit/29883ffc7104d4beb13965bfa65ea609367ede69))
* enhance Quick Start card layout for improved responsiveness and usability ([649bbf6](https://github.com/useplunk/plunk/commit/649bbf6d6b9db5139295a455c69425a5565d4323))
* handle undefined path in footer component for improved stability ([715961c](https://github.com/useplunk/plunk/commit/715961c007e450731434e5f343acff0debd6a851))
* implement mergeContactData method for efficient contact data updates ([a27d564](https://github.com/useplunk/plunk/commit/a27d564e1af6e5cf72c9ef405650f2475bfd0c86))
* improve iframe height adjustment logic in EmailEditor component ([9e4aa94](https://github.com/useplunk/plunk/commit/9e4aa9443b53ef38a3af1b269f4a949dd57e758f))
* pass DISABLE_SIGNUPS and EMAIL_RATE_LIMIT_PER_SECOND through compose; trim .env.self-host.example ([8a26d60](https://github.com/useplunk/plunk/commit/8a26d605b4aa5fdea0e02a17159c1cae478a7e47))
* pass missing env variables from .env.self-host.example to plunk service ([f178c59](https://github.com/useplunk/plunk/commit/f178c59b5bc461f9ba57dc6f0bac9617feaab4a3))
* replace font loading method with utility function for improved performance ([ba23a1c](https://github.com/useplunk/plunk/commit/ba23a1c6fa70ca6fa0343391fa8d642155ad45c2))
* update activity item colors and backgrounds for improved visual distinction ([e43f70d](https://github.com/useplunk/plunk/commit/e43f70d8a135b048d4e9ed013ffa25f1b2f89687))
* update middleware matcher to exclude webmanifest files ([cbb3bff](https://github.com/useplunk/plunk/commit/cbb3bffcf4f789e9c36912c9b0ce0ba9f6a1d4dd))
* update not found handling in GET route to return 404 response ([7615b62](https://github.com/useplunk/plunk/commit/7615b62945aa1939bf6a5b3638c232509090de60))
* update segment filter logic to retain value and unit, enhance activity name mapping ([d1f357c](https://github.com/useplunk/plunk/commit/d1f357c300c7798d5c8d521e1219e39e7da821dd))
* update segment filter logic to retain value and unit, enhance activity name mapping ([a126563](https://github.com/useplunk/plunk/commit/a1265635420e66b7cdef02a7136fdf9c3aec4418))
* update TemplateSearchPicker to maintain selected template name on change ([2ea1802](https://github.com/useplunk/plunk/commit/2ea1802290a4378d68e3878a44e502ea8541b301))


### Code Refactoring

* convert forwardRef components to function components for consistency ([361ec0b](https://github.com/useplunk/plunk/commit/361ec0b1eb17647696656c6a6d4cddd5b9348b45))
* implement step dialog components for workflow editing ([ed9027b](https://github.com/useplunk/plunk/commit/ed9027b4ef9c37e91c69ed5a90d5b74c08c7a054))
* remove unused .png files ([2d05c3f](https://github.com/useplunk/plunk/commit/2d05c3fbc1ded87880a307943bb93106b18cd406))


### Documentation

* expand documentation with new sections on importing contacts, unsubscribe pages, and API key management ([4ddafdc](https://github.com/useplunk/plunk/commit/4ddafdc0419389818de7e45eb4a0c82c2e9382eb))
* update README to clarify self-hosted alternative and add inbound emails feature ([80ef65e](https://github.com/useplunk/plunk/commit/80ef65e04b8c362f05ae5b7d5710b398a150cce5))

## [0.10.0](https://github.com/useplunk/plunk/compare/v0.9.0...v0.10.0) (2026-05-01)


### Features

* add className prop to EmptyState component for custom styling ([c278a0f](https://github.com/useplunk/plunk/commit/c278a0fd944977d4ea3a0c5a4a43ff4cc0a13aa3))
* add configurable attachment limits for email service ([2eb4079](https://github.com/useplunk/plunk/commit/2eb407993bd5fed3e74be73445185e517c18b994)), closes [#358](https://github.com/useplunk/plunk/issues/358)
* add middleware support for .md file rewrites ([0b3aa28](https://github.com/useplunk/plunk/commit/0b3aa28101d50a734945ce19b924f9aa30631c64))
* add updateActiveProject function for in-place project updates ([6f31fa2](https://github.com/useplunk/plunk/commit/6f31fa2503b11e3a9a37d753086bbb74b42f7bc4))
* enhance contact addition with bulk email lookup and subscription options ([bb72911](https://github.com/useplunk/plunk/commit/bb72911fa25e3a204095e74c07efbc261154ac30))
* enhance contact data handling by filtering empty strings and allowing null to delete fields ([1094651](https://github.com/useplunk/plunk/commit/10946511b019ff76ce5f785a39cc0db4ea9ce820))
* Enhance ease of use of workflow editor ([c910d20](https://github.com/useplunk/plunk/commit/c910d20bb71ff5de4abf95f3f96be9c435342cb4))
* implement CommandPalette for enhanced navigation and recent pages tracking ([1c89ed0](https://github.com/useplunk/plunk/commit/1c89ed083e49148967713e9a9c2f7f8833db07c4))
* implement meter event processing with queue for Stripe billing ([e048fc1](https://github.com/useplunk/plunk/commit/e048fc157080b36f40fbfc4440db51367a2d374b))
* implement phishing detection using OpenRouter API with configurable sampling rate ([2da8b06](https://github.com/useplunk/plunk/commit/2da8b065d08438aa2adea397d8ab2a560e996af6))


### Bug Fixes

* Add in-memory cache for lower-confidence phishing checks ([208c809](https://github.com/useplunk/plunk/commit/208c809a90d0721261e643523b338d05e23e2bf9))
* add new configuration options for phishing detection thresholds ([c0e0ad8](https://github.com/useplunk/plunk/commit/c0e0ad8bc6bfdddea5193191156d18aad440c2b0))
* add project name and sender email parameters to phishing content check ([1637d54](https://github.com/useplunk/plunk/commit/1637d54e1b132dd6864fb1c50d23a388c1c47bf5))
* add project name and sender email parameters to phishing content check ([15294a4](https://github.com/useplunk/plunk/commit/15294a40d88289fa8fd876c9e7c201eb1e2ca956))
* Consistency across buttons and labels ([c1bcd35](https://github.com/useplunk/plunk/commit/c1bcd358cc611594d851414687c04bf7a03759a1))
* Consistency across cards ([517753c](https://github.com/useplunk/plunk/commit/517753c420204510e06decec01db7749894a9265))
* Content negotiation for xml and txt ([c8190b9](https://github.com/useplunk/plunk/commit/c8190b953f9f2e28e6cfa98e72d8dcfbba7e251b))
* Harmonize rings and hover states ([f40cc86](https://github.com/useplunk/plunk/commit/f40cc86cec661899fb862b56ce3e35bf70b33e54))
* improve layout and accessibility of workflow header and buttons ([ab3edd7](https://github.com/useplunk/plunk/commit/ab3edd7dc9030eeb770ffd64087476adf10d2d06))
* log message for projects passing phishing checks ([8628754](https://github.com/useplunk/plunk/commit/862875428d21de03643e8e51126cc59abef95ccb))
* prevent unnecessary state updates in search input effect ([98f1e80](https://github.com/useplunk/plunk/commit/98f1e80fca8253c125ba24c4d84c5be86841e1fa))
* reconcile totalRecipients in CampaignService to prevent stuck campaigns ([4322de9](https://github.com/useplunk/plunk/commit/4322de929a84279370bedcbb4f6b7dcd81145aea)), closes [#348](https://github.com/useplunk/plunk/issues/348)
* **ses:** emit List-Unsubscribe inside the header section, not the body ([11c428d](https://github.com/useplunk/plunk/commit/11c428d4ffe7c8aa87aac4d24148aaa95e01507a))
* standardize step type labels and update visual styles in workflow components ([bdc9b30](https://github.com/useplunk/plunk/commit/bdc9b30ef29396870aa42515b8e688485a4673e8))
* Sync display name in TemplateSearchPicker when initialName changes ([3649392](https://github.com/useplunk/plunk/commit/3649392b475271198cd61295091e8acf708efa25))
* Sync display name in TemplateSearchPicker when initialName changes ([cbde3cc](https://github.com/useplunk/plunk/commit/cbde3cce3fcee382dae04e79a9480e67ad896725))
* turn warning into success log ([b7eb254](https://github.com/useplunk/plunk/commit/b7eb2549d433552f32783b6fb8c192f5afb48ecd))
* update phishing confidence threshold to 95% ([bb78c86](https://github.com/useplunk/plunk/commit/bb78c86c400b60fb0e84c7872e20ad6f7c43c199))
* update project disabled messages for clarity and consistency ([d7eb85f](https://github.com/useplunk/plunk/commit/d7eb85ffdd99177c5e27104779281f5a08fe36a7))
* update project icon colors for improved visibility and consistency ([5f741c6](https://github.com/useplunk/plunk/commit/5f741c66c7f0c9c25c45b26917ff68529d15f958))
* update response format for phishing analysis and improve JSON parsing comment ([91d0d2d](https://github.com/useplunk/plunk/commit/91d0d2d297cb38fe0dfdfd7f73df355e2f51096a))

## [0.9.0](https://github.com/useplunk/plunk/compare/v0.8.0...v0.9.0) (2026-04-20)


### Features

* Add accept/markdown to apps/landing ([df76be1](https://github.com/useplunk/plunk/commit/df76be1b87de14769a219ae0e6c99711edf993a1))
* Add emailId field to webhook events for better correlation with send requests ([ae64c2d](https://github.com/useplunk/plunk/commit/ae64c2dbb5b76f16b562641953f262d76ea0d8e8)), closes [#344](https://github.com/useplunk/plunk/issues/344)
* Add headless template type ([fb5aa87](https://github.com/useplunk/plunk/commit/fb5aa8796a8550be7a70fdd91616c9a41ed3047d))
* Add onboarding flow ([bd5a085](https://github.com/useplunk/plunk/commit/bd5a0858021b9d74fae07cca5d2a0b8c10deabd7))
* Add type to campaign ([d24259e](https://github.com/useplunk/plunk/commit/d24259e8d202edd1b8c7771a63cc212c982b52e1))
* Block domain changes for disabled projects with appropriate error handling ([44c8657](https://github.com/useplunk/plunk/commit/44c86572c275221b5068605c64958f43a1f96ff4))
* Disable projects on failed payment ([3343e89](https://github.com/useplunk/plunk/commit/3343e891bdbcfee7d17d73a0d7fb181652e7c262))
* Enhance email processing to include parsed HTML body content in inbound email records ([e339508](https://github.com/useplunk/plunk/commit/e3395083db11fdb4b6cfdbace46518792ec132a3)), closes [#342](https://github.com/useplunk/plunk/issues/342)
* Enhance login forms with last used authentication method ([f2ebce0](https://github.com/useplunk/plunk/commit/f2ebce0ef2ac9c9c4e994cb754f67f6fa8a3f465))
* Enhance security metrics handling with new thresholds and improved messaging ([c0b2aba](https://github.com/useplunk/plunk/commit/c0b2abaeca5656743e189f975ab82ff9b25b577b))
* implement AWS SNS signature verification in SecurityService ([b79d416](https://github.com/useplunk/plunk/commit/b79d4166671cc04cc1458d2c24af262af0e16c9e))
* integrate DOMPurify for sanitizing HTML content ([bf12392](https://github.com/useplunk/plunk/commit/bf12392b88fc92b0760333e1b568e3d6d1b6ed74))
* Update new project bounce thresholds for stricter email handling ([5e62f51](https://github.com/useplunk/plunk/commit/5e62f517fc896849c270e795cd31a110b83707cc))


### Bug Fixes

* Enhance email processing to support campaign types and improve unsubscribe logic ([9e2400c](https://github.com/useplunk/plunk/commit/9e2400c6de6f13c498f02c489f956ebf89de36b0))
* Hint custom event names in combobox when no matches are found ([3214f6c](https://github.com/useplunk/plunk/commit/3214f6c42d4ca6ab628e905ac69ed82648ccf47c))
* Implement content negotiation for markdown and html in middleware ([37ed1e4](https://github.com/useplunk/plunk/commit/37ed1e49b78eb9339e7b62fd2fd5b60d451707d6))
* Implement SSRF protection in webhook handling with safeFetch method ([2c5a715](https://github.com/useplunk/plunk/commit/2c5a71518da358927bd5e41035b85fd278790b47))
* Refactor date filtering logic for pagination in ActivityFeed and ActivityService ([52cb2b6](https://github.com/useplunk/plunk/commit/52cb2b6c77bc3912b356887bdd48e9c8b9b1728a))
* Update language validation regex to support locale variants ([7834b9e](https://github.com/useplunk/plunk/commit/7834b9e7ef615ba029a1a091b0c37c8f40eb543c))


### Documentation

* Add content negotiation to apps/wiki ([545d733](https://github.com/useplunk/plunk/commit/545d7337948f41f006f9cb0270b4bfff2b08ed2c))

## [0.8.0](https://github.com/useplunk/plunk/compare/v0.7.1...v0.8.0) (2026-03-31)


### Features

* Add multi-branch workflow conditions (switch/case) ([92949b7](https://github.com/useplunk/plunk/commit/92949b7596740b73d04c30e0e2bcc6305bbdf4a7))
* **i18n:** add Chinese translations (zh-TW, zh-HK, zh-CN) ([33df563](https://github.com/useplunk/plunk/commit/33df5632a3d4068e641687c8d404a6eef4aa4d0e))
* **i18n:** add Italian translation ([7b6872c](https://github.com/useplunk/plunk/commit/7b6872c4b79b0fde4491f02851a2049c846c83d6))


### Bug Fixes

* Adapt SNS Webhook validation regex pattern to also support AWS eusc partition ([7b6540a](https://github.com/useplunk/plunk/commit/7b6540a748a90c10f41b931450ac809e7ae23c01))
* add alt text to email badge image ([3b39d84](https://github.com/useplunk/plunk/commit/3b39d847cd278317723b4b226434c26c49becebe))
* broken links to next-wiki.useplunk.com ([e3ea5fb](https://github.com/useplunk/plunk/commit/e3ea5fb6dcea95b5028f140b77e54d5938497223))
* Connect branches smoothly to original node ([2c3e897](https://github.com/useplunk/plunk/commit/2c3e8970cbc4ad2eb39fd505a4292345c6cae1c0))
* Enhance email step configuration validation and recipient handling ([b50b5af](https://github.com/useplunk/plunk/commit/b50b5af763d8a44b09c7022e1d9135bfca7907f6))
* Enhance email step configuration validation and recipient handling ([a99cde8](https://github.com/useplunk/plunk/commit/a99cde88392450bf719112cb94cc1b9e7c7c1478))
* normalize field references and handle undefined values in JSON ([b9d692c](https://github.com/useplunk/plunk/commit/b9d692cf5b491ab22a40ec69e77ff7bdc62eec63))
* Prevent switching if nodes are attached to multi-branch ([c32b54f](https://github.com/useplunk/plunk/commit/c32b54f588db79a501db456e6075a337dee8ed26))
* update old references to next.useplunk.com ([44987d2](https://github.com/useplunk/plunk/commit/44987d2b5e8028c6f8f26c39e9dec386e1ccf6e1))
* visual editor preview ([4451e92](https://github.com/useplunk/plunk/commit/4451e921caff45dab126006ba103d91816bed696))


### Documentation

* Fix broken links on api overview page ([dc2ce02](https://github.com/useplunk/plunk/commit/dc2ce02d1a4e4d1641728b720ca856cedba719a7))
* Improve self-hosting env variable documentation ([f0ef346](https://github.com/useplunk/plunk/commit/f0ef34646e7593f07a780141e14d6d2b735c1101))

## [0.7.1](https://github.com/useplunk/plunk/compare/v0.7.0...v0.7.1) (2026-03-10)


### Bug Fixes

* Align preview and actual email for templates and campaigns ([cc7fcdb](https://github.com/useplunk/plunk/commit/cc7fcdb4ef31e9dfb4f7403aa93479b6df56719d))


### Documentation

* Add inbound to docs ([6c4cc29](https://github.com/useplunk/plunk/commit/6c4cc295b88db6da8d9edcf23064a3fc8e9f5c36))
* Improve webhook documentation ([f6a32ce](https://github.com/useplunk/plunk/commit/f6a32ce610559050c1ca9978607bd57ac51e906f))

## [0.7.0](https://github.com/useplunk/plunk/compare/v0.6.0...v0.7.0) (2026-03-05)


### Features

* **api:** support inline images in emails using Content-ID ([9b15b93](https://github.com/useplunk/plunk/commit/9b15b93b96344f811d869d103b3b6d344b531811))
* Sort projects alphabetically in the dashboard and fix layout ([64bd094](https://github.com/useplunk/plunk/commit/64bd094b47abbc4feaeb93d97915df57763b3907))
* Static segments ([4b51e38](https://github.com/useplunk/plunk/commit/4b51e386e39ae38d6ea52eb87858de36fa45ab46))


### Bug Fixes

* Add support for STATIC segment type in CampaignService ([7bd098b](https://github.com/useplunk/plunk/commit/7bd098bdd01a8af0dd41ec515880289b1795e5af))
* correct cookie domain for .local TLD hostnames ([59aa784](https://github.com/useplunk/plunk/commit/59aa7845bad69a1768bb88f83cfcea607c447538))
* Correctly set domain status on manual verify ([21af8fe](https://github.com/useplunk/plunk/commit/21af8fe05e0450e8d826a3a01224511a337ca072))
* Do not unsubscribe existing contacts ([2c4d95e](https://github.com/useplunk/plunk/commit/2c4d95e604cbed9189f7ee07c24b1f236fce7990))
* Support any locale on creation ([ec1f4c9](https://github.com/useplunk/plunk/commit/ec1f4c9374e06e3defed3c728be603c10e4e7baa))
* Verify SNS URL before sending fetch request ([b8f1ad9](https://github.com/useplunk/plunk/commit/b8f1ad9ab53c78f8ef063fdc125f397c8bfc7652))


### Documentation

* Static segments ([e8a247f](https://github.com/useplunk/plunk/commit/e8a247fe12b79ae8a25a74485179e93081fe2002))

## [0.6.0](https://github.com/useplunk/plunk/compare/v0.5.0...v0.6.0) (2026-02-19)


### Features

* Ability to change workflow trigger ([eec37ec](https://github.com/useplunk/plunk/commit/eec37ecb31c63888879a1933dba4fd0c6243018b))
* Add billing for inbound ([3330d83](https://github.com/useplunk/plunk/commit/3330d83d08904bc547740bfc9fdcbc5ff214d977))
* Add billing for inbound ([de7ed84](https://github.com/useplunk/plunk/commit/de7ed84fcfddde16a9297c947048e9876712f6fa))
* Add dedicated received type ([f947ee6](https://github.com/useplunk/plunk/commit/f947ee6f22371055801fa9cfc62e15df7851986c))
* **i18n:** Add Spanish language ([9c69c7a](https://github.com/useplunk/plunk/commit/9c69c7a36edd86fdc02b8d0d3e3f8d64ed8ecfa6))


### Bug Fixes

* Enhance email bounce notification with latest bounce details ([e639c72](https://github.com/useplunk/plunk/commit/e639c72e8b940ba1da472d355f930359da7c868b))


### Documentation

* Add receiving emails functionality and update DNS records documentation ([b426986](https://github.com/useplunk/plunk/commit/b42698616a3f7bb079a092375ac886f2a9d7405d))

## [0.5.0](https://github.com/useplunk/plunk/compare/v0.4.0...v0.5.0) (2026-02-17)


### Features

* Ability to disable signups and disable email verification for self-hosters ([9316564](https://github.com/useplunk/plunk/commit/93165644af1ebcd7d5eb1900b13e5e38c1af0262))
* add "olderThan" segment filter operator ([b5fa21a](https://github.com/useplunk/plunk/commit/b5fa21a57cbf491e0438eb29fc9419063fa2aea7))
* Add additional checks for website, NS records and personal emails ([0a67a82](https://github.com/useplunk/plunk/commit/0a67a8278f45d89b1abdf55be1cf251a470595cf))
* Add advanced DNS configuration ([7964563](https://github.com/useplunk/plunk/commit/7964563b620868279f5fb6baab0d7499c41f51ed))
* Add bounce and complaint filter to activity feed ([c85df75](https://github.com/useplunk/plunk/commit/c85df75d539f7e5500a9a109966b0e6d654d4022))
* add documentation link and redirect to WIKI_URI ([4c81d9e](https://github.com/useplunk/plunk/commit/4c81d9ec04003550b140d884f37ebbf13137166d))
* Add inbound handling ([d050b55](https://github.com/useplunk/plunk/commit/d050b55baaf46306be3fb6e5ad683205e158bd65))
* Add initial handling in webhook for inbound ([e01dc40](https://github.com/useplunk/plunk/commit/e01dc4066c5e5eb5e0e69ef92f8a5bb7786e5a91))
* Add initial handling in webhook for inbound ([c286f49](https://github.com/useplunk/plunk/commit/c286f490974d8dfe9c94695c63e6b48216b8052d))
* add minimum thresholds for bounce and complaint rates ([d55dda3](https://github.com/useplunk/plunk/commit/d55dda312718890231d1a428448e607792799c84))
* Add support for custom email recipients in workflow steps ([78d3d22](https://github.com/useplunk/plunk/commit/78d3d224af60cf5b58c6b18fdd0921320912fb09))
* **i18n:** Add Bulgarian translations ([663bc2b](https://github.com/useplunk/plunk/commit/663bc2be8da69733d2bbc53c6b1bfcc36ff55cf8))
* **i18n:** add Czech locale translations ([14c471e](https://github.com/useplunk/plunk/commit/14c471e4cadbe1bbf90e53522134fad3d81ff107))
* **i18n:** add Polish locale translations ([7a6df77](https://github.com/useplunk/plunk/commit/7a6df7760bc73dfe80dcf2d37612e320f6de1d30))
* **i18n:** add Polish locale translations ([d2d779c](https://github.com/useplunk/plunk/commit/d2d779c68f958a6ac0e77b7588e92a5c705a8fd4)), closes [#246](https://github.com/useplunk/plunk/issues/246)
* **i18n:** Add Portuguese translations ([c2afb2d](https://github.com/useplunk/plunk/commit/c2afb2dfab977ae74f3b694601a1f2d0353660a8))
* Integrate NuqsAdapter for improved state management and query handling ([0cf0a26](https://github.com/useplunk/plunk/commit/0cf0a26a97e608f654ed3046c1a46d414557e3ee))
* Remove domain from AWS if no longer in use by other projects ([e6baace](https://github.com/useplunk/plunk/commit/e6baace00d5f7a109e717b8a996bc2cda52cc9fa))


### Bug Fixes

* added missing services:down script, added "win32" to supportedArchitectures for yarn package installation, added missing required WIKI_URI to .env.example of api ([ddbe523](https://github.com/useplunk/plunk/commit/ddbe5237fe7012e197e3b398aebc8e2921a4328a))
* Center "Add Step" nodes below parent nodes and update positions on drag ([e4e334c](https://github.com/useplunk/plunk/commit/e4e334c77a7ba41e5a60b69b9c64fa3bb72f1e74))
* Enhance email activity filtering by adding date range checks ([ad0c17d](https://github.com/useplunk/plunk/commit/ad0c17da566a26a296229c05d9b4e18cf7d401ad))
* Ensure template type is loaded before rendering Select ([8a38766](https://github.com/useplunk/plunk/commit/8a38766c025afd5ef15fee4b7c5baea97a45ec48))
* Implement merging for activity updates to preserve component state ([0d4b694](https://github.com/useplunk/plunk/commit/0d4b694208fd8e516e1f50f7384d1ac5bd6561e0))
* Improve bounce handling logic to differentiate between permanent and transient bounces ([7df43d8](https://github.com/useplunk/plunk/commit/7df43d8553eca93b601915ea4deaf59233e848c7))
* Improve email verification logic by prioritizing MX record checks and clarifying domain existence validation ([26800a8](https://github.com/useplunk/plunk/commit/26800a85538fc90aa05fc43b1cc33cef95d8fb32))
* Refactor Redis keys to prevent multiple messages on concurrent requests ([4db1ccc](https://github.com/useplunk/plunk/commit/4db1ccc3fc59edb0187d8e2223f45bb0bce6deb5))
* Remove 'Optional' label from MAIL FROM Domain and Inbound Email headings ([f9b1354](https://github.com/useplunk/plunk/commit/f9b135446040de099484db66139560f43bbf027e))
* Update contact subscription logic for upsert operations ([a928666](https://github.com/useplunk/plunk/commit/a928666dfcdc65c90602051c79b3c008282674aa))
* Update URL replacement logic to handle runtime paths and add warnings for missing files ([c07816c](https://github.com/useplunk/plunk/commit/c07816c2a1b029d83400128f4720263e975214ad))


### Code Refactoring

* remove unnecessary logging for segment processing ([42ceb6e](https://github.com/useplunk/plunk/commit/42ceb6edc03ebc6f14c6d399e859914ac09f1ab6))


### Documentation

* add webhooks documentation for real-time event handling ([5bce1d7](https://github.com/useplunk/plunk/commit/5bce1d74fffb927bcbb2c7df624fde089101efc8))
* update contacts documentation to include subscription state and email delivery rules ([b4404f6](https://github.com/useplunk/plunk/commit/b4404f698ec28a59f32d728c15c59c8b7765d377))

## [0.4.0](https://github.com/useplunk/plunk/compare/v0.3.0...v0.4.0) (2026-01-08)


### Features

* Add cooldown to resend verification email ([457c829](https://github.com/useplunk/plunk/commit/457c829b2d59debc41ac69f907f758dd5ded1c1a))
* Add email verification on signup ([fb02051](https://github.com/useplunk/plunk/commit/fb02051538029d8a6b806ce69b25fb9e75622693))
* Add forwarding domains as verification check ([e732c76](https://github.com/useplunk/plunk/commit/e732c76490e015b87a9165a98f1f1b5084552f84))
* Add id as reserved field in templates, campaigns and workflows ([7386441](https://github.com/useplunk/plunk/commit/7386441e6137ac9f059a3818895f1b1059e2d99d))
* Add platform emails for domain verification and expiration ([19554e6](https://github.com/useplunk/plunk/commit/19554e6e8f94fbcf74006017454aa83a707617ea))


### Bug Fixes

* Add better validation for sender email ([e75e07f](https://github.com/useplunk/plunk/commit/e75e07f73f5928ded281d2704b0fd06fedeb9077))
* Catch unknown content-type headers ([a5c5754](https://github.com/useplunk/plunk/commit/a5c575444ba698624b3932b4d6414c5ad9df282a))
* Check email volume for 7-day window ([492beb0](https://github.com/useplunk/plunk/commit/492beb095fd7be0cfd3de9761420d7ce1170d56f))
* Copy types build files ([49824af](https://github.com/useplunk/plunk/commit/49824aff93c7ce09caa0cb57cfef68ae296f6626))
* Enhance CORS handling to allow requests with rejection logging ([718251c](https://github.com/useplunk/plunk/commit/718251c67c876352a5dfca7592613e33f6713061))
* Migrate over to new pagination format in dashboard ([8790c45](https://github.com/useplunk/plunk/commit/8790c45edc1374f9649b8438563fc8844a645367))
* Reentry into segment not working after exit ([4dce71a](https://github.com/useplunk/plunk/commit/4dce71a1fe22774391bf0d0e87f1564c3b93b496))
* Refactor CORS handling to allow unrestricted access for public API endpoints ([940c893](https://github.com/useplunk/plunk/commit/940c8938f163879da5be205bcc8bb82ecd69279a))
* Update sentCount on campaign sent for correct overview stats ([ee00eb3](https://github.com/useplunk/plunk/commit/ee00eb34811270473d1f79729853eaada883a477))
* Update template fetching to use Template type and simplify body access ([b6c5471](https://github.com/useplunk/plunk/commit/b6c5471d272e8ba835282691946a418385896c98))
* Update templates data fetching to use PaginatedResponse type ([fa22b82](https://github.com/useplunk/plunk/commit/fa22b8220a909e7234948aeeb2a6734ae51aeec9))


### Documentation

* Add more details about personalisation ([940a4d2](https://github.com/useplunk/plunk/commit/940a4d225b86ba5af5377851ab758a43b3aa71ff))

## [0.3.0](https://github.com/useplunk/plunk/compare/v0.2.0...v0.3.0) (2025-12-29)


### Features

* Ability to overwrite locale on contact level with locale key on data ([7615523](https://github.com/useplunk/plunk/commit/76155232a3383e75e8c7b44a498454b07472852a))
* Add additional banner and information about security metrics ([bc8611a](https://github.com/useplunk/plunk/commit/bc8611a66250eb7747e7acd6e882a740c0028ba1))
* Add bulk actions to contact overview ([726f667](https://github.com/useplunk/plunk/commit/726f66762b890c73041139432524d6c85d6bd709))
* Add email verification and password reset ([1a5607f](https://github.com/useplunk/plunk/commit/1a5607f2780d5a4692492032dd0cd2e7521362d9))
* Add email verification endpoint at /v1/verify ([6a9f6aa](https://github.com/useplunk/plunk/commit/6a9f6aa65a3219c5d4d6f33253cdcf145c3ff20b))
* Add plus address check to /v1/verify ([afc405e](https://github.com/useplunk/plunk/commit/afc405ec028ac9d7333a7817c49f1232278fc28b))
* Add project-scoped language for unsubscribe footer and contact-facing pages ([e1f8263](https://github.com/useplunk/plunk/commit/e1f826357d1e8cff7bd3c2811698734f578836f5))
* Allow to pick currency when starting subscription ([8a136dd](https://github.com/useplunk/plunk/commit/8a136dde55fd1fae1f2a2e285019beb35fc75977))
* Email preview in contact and activity feed ([72dffe1](https://github.com/useplunk/plunk/commit/72dffe12e53ff9d74ef43da2cf653d31e7a4df25))
* **i18n:** add German translations and update supported languages ([a6bd2e7](https://github.com/useplunk/plunk/commit/a6bd2e7dba261a858eab6ab1f782ddc9efb136a5))
* **i18n:** add Hindi translations for contact-facing pages ([ddc14ae](https://github.com/useplunk/plunk/commit/ddc14ae8534eda2e1368f148e0434388008bb7b5)), closes [#246](https://github.com/useplunk/plunk/issues/246)


### Bug Fixes

* Add styling for visual editor emails in preview ([5993b84](https://github.com/useplunk/plunk/commit/5993b842a0f17d66644aaa3057602ae8f3daebc2))
* Correctly reserve fields from being set on contact ([61cea95](https://github.com/useplunk/plunk/commit/61cea95697ccb56c525002b08f76bf57da896837))
* Date filtering not working properly for custom contact data ([97ab0a2](https://github.com/useplunk/plunk/commit/97ab0a2c2c811ac1b8a2b9039ab835e837a3f3be))
* Do not check verification if platform emails are not enabled ([9567144](https://github.com/useplunk/plunk/commit/9567144390512173f7f615db71368c1cd26d9f4d))
* Import no longer case-sensitive about email column ([451dd03](https://github.com/useplunk/plunk/commit/451dd0327f4866fd27343407a84a6c979cfcd70d))
* Pass through email verification if auth type is apiKey ([d7b5d3f](https://github.com/useplunk/plunk/commit/d7b5d3f60ed1af6ca9bf8e2a659204a01ca3acb0))
* Persistence of subscription state for existing contacts ([007a908](https://github.com/useplunk/plunk/commit/007a908e833cdd1b229f485c34c17c6510a55f9c))
* Properly tag events in SegmentFilterBuilder.tsx ([8f725c7](https://github.com/useplunk/plunk/commit/8f725c7c84749eca5647fdbd19d41260f6998d6e))
* Redirect verification link to dashboard instead of landing ([35f5275](https://github.com/useplunk/plunk/commit/35f5275d889b167e0fe75246b29a4ffa632bad46))
* Set auth type before disable check ([862babb](https://github.com/useplunk/plunk/commit/862babb8f5ab47599ce6a841fc988fafa1ec0bbe))
* Variable substitution in transactional emails ([8c03042](https://github.com/useplunk/plunk/commit/8c0304273c2bd1a64718ec56838632aa63447ef8))


### Documentation

* Add locale overwrite to project documentation ([1fc1e23](https://github.com/useplunk/plunk/commit/1fc1e23fce69a870ccf95faf2fff644733de7145))
* Add plus address check to /v1/verify ([0d54b1a](https://github.com/useplunk/plunk/commit/0d54b1a631415a15e504ff5bd4573ddb12cc421a))
* Improve docs with core-concept and guides ([2ddfcec](https://github.com/useplunk/plunk/commit/2ddfceca3606b0d4d832f83fce14c7277b5eaa35))
* Update openapi.json to match actual API outputs ([dc9b88d](https://github.com/useplunk/plunk/commit/dc9b88dedb75535814239b4bc73f62375570998b))

## [0.2.0](https://github.com/useplunk/plunk/compare/v0.1.1...v0.2.0) (2025-12-16)


### Features

* ability to create new campaigns based on templates or previous campaigns ([6b25bbe](https://github.com/useplunk/plunk/commit/6b25bbe2f86e5dd6946ea38a9f34e9c7bdb5fb0f))
* Add improved html editor using CodeMirror ([672f1e6](https://github.com/useplunk/plunk/commit/672f1e6657293860554be1f86167cf4f4403b0ff))
* Add security center and warning for exceeding bounce/complaint rates ([fbd3038](https://github.com/useplunk/plunk/commit/fbd303801f9f1c260c5f8201bf218c9f277fe4d1))
* Added platform emails for billing limits and disabled projects ([2485d2f](https://github.com/useplunk/plunk/commit/2485d2ff1db652e87f8f1307c8ef770edd19bbd1))
* Automatically detect rate limit from AWS with ability to override in .env ([3225c50](https://github.com/useplunk/plunk/commit/3225c5005be42f1443fdca0f8233193ce029c890))
* Improved createdAt and updatedAt visualisation ([1019ba0](https://github.com/useplunk/plunk/commit/1019ba0d82c7cb6a0d4cef5989841ccc28dae776))


### Bug Fixes

* ability to clear reply-to and from name from templates and campaigns ([badb035](https://github.com/useplunk/plunk/commit/badb035585561b276b6e82a363693918810c8214))
* Add additional checks for disabled projects ([863e784](https://github.com/useplunk/plunk/commit/863e784e1c806118204acb3ba489322fe51498ad))
* Add additional checks for disabled projects ([780741e](https://github.com/useplunk/plunk/commit/780741e37f7fec5b822b91c329ebe98428077ba0))
* add additional indexes on event model ([1cd89d1](https://github.com/useplunk/plunk/commit/1cd89d137511ed4a8ae932a10f4f21487fbcee7c))
* Allow changing audience type after creation of campaign ([85b9d7a](https://github.com/useplunk/plunk/commit/85b9d7afe718c803be147475d5fbe13dafd677bf))
* Better highlight warnings in SecurityWarningBanner.tsx ([91eb0f3](https://github.com/useplunk/plunk/commit/91eb0f3a699eb7a51e87addfa122107ce74b4a39))
* Clear notification cache keys when changing billing limits ([e50c33a](https://github.com/useplunk/plunk/commit/e50c33ae4b2d5144a1bfce72ae97d8ede0187d17))
* Correctly show recipient count during creation and edit ([d0191be](https://github.com/useplunk/plunk/commit/d0191be31da8fc894269851a247746ce39a958b2))
* custom relative time to shorten strings for better UI fit ([5e4adb7](https://github.com/useplunk/plunk/commit/5e4adb71ade38cf53e67776ae3524a381641fcfd))
* display email progress instead of scheduling progress for campaigns ([07f875c](https://github.com/useplunk/plunk/commit/07f875c18c03a8d1766040bc40034c1023715fcd))
* Hide upsell banner if billing is not configured ([433e796](https://github.com/useplunk/plunk/commit/433e796c041e8d65068084d5c7729c397956098e))
* Increase z-index of color picker ([769e374](https://github.com/useplunk/plunk/commit/769e3748a0bbbcafdb1f79c9aea22d282e39b513))
* Move react and react-dom to dependencies instead of peerDependency for API ([a555a12](https://github.com/useplunk/plunk/commit/a555a127366f753130c765f9eb4700dc44a8cb7c))
* Move react and react-dom to dependencies instead of peerDependency for API ([f37bfcc](https://github.com/useplunk/plunk/commit/f37bfccbc22a0c2672971ff0e174f49f31301876))
* Only check free tier limits if billing is enabled ([1713b23](https://github.com/useplunk/plunk/commit/1713b2398d5c238058639ac5a0d5cef916a7a1e8))
* Only fetch project members if project Id is defined ([5a0a41c](https://github.com/useplunk/plunk/commit/5a0a41c6bbbb9bd4eefd5ed62e02c0a7c00c1022))
* Overflow of inputs in email editor ([3336fa1](https://github.com/useplunk/plunk/commit/3336fa1e38a29d9c1f69c62259662b1ff2ba6e61))
* Prevent manual tracking of internal events that are automatically tracked ([f34052e](https://github.com/useplunk/plunk/commit/f34052ed73cd78db4e4bf39cab8740ce0b78e93c))
* prevent scheduling of campaign if billing limit reached ([a3bbb1e](https://github.com/useplunk/plunk/commit/a3bbb1ed64ba461cb2f7170c1929f68f22b5bb4d))
* show correct default value for placeholder ([04275e3](https://github.com/useplunk/plunk/commit/04275e3cf59f902d50acb84e756f1c7425171726))
* Unauthenticated users are redirected to login on subscribe/unsubscribe/manage pages ([11ef47b](https://github.com/useplunk/plunk/commit/11ef47b576ec39209f2b9726c1027d06f8bbc03a))
* Update recipient count on create/update of campaign ([ff5c79c](https://github.com/useplunk/plunk/commit/ff5c79cfcf0ac6b351af20345ec639110f206f4b))
* Verify if sending without tracking is possible in SESService ([68f9979](https://github.com/useplunk/plunk/commit/68f99798f8c5944c18b438329b961fdec955ecef))

## [0.1.1](https://github.com/useplunk/plunk/compare/v0.1.0...v0.1.1) (2025-12-08)


### Bug Fixes

* Add additional verification in Oauth controllers ([53ecda9](https://github.com/useplunk/plunk/commit/53ecda9f7a34111785ac3ea3af18cb33460a44af))
* add clear cache button on full-screen loader ([60804c1](https://github.com/useplunk/plunk/commit/60804c12b0b4c4c3ef97e730e4857d41fa1fd021))
* Dedicated token name for next version ([fc535a5](https://github.com/useplunk/plunk/commit/fc535a558fab28045dae9ce978f483e58c72a24f))
* only mark releases as latest ([9d8b4a5](https://github.com/useplunk/plunk/commit/9d8b4a59fbd42420bb595d2a44df93a29214121a))


### Documentation

* dynamic link to Docker Compose for self-hosting ([90f8170](https://github.com/useplunk/plunk/commit/90f8170efbad0cec981a24e7831840aac65d8d70))
* Update AWS setup docs ([f7ac25f](https://github.com/useplunk/plunk/commit/f7ac25f91f4e1dcce301fb325801a67f2a9dee07))

## [0.1.0](https://github.com/useplunk/plunk/compare/v0.0.1...v0.1.0) (2025-12-08)


### Features

* Added ability to overwrite sender mail and name for templates and campaigns ([f1d4d50](https://github.com/useplunk/plunk/commit/f1d4d5073ccd7ddceabfdbd268c5ff142480fb75))
* basic health-checks ([2e69173](https://github.com/useplunk/plunk/commit/2e69173d1378bec8296ce556499f71990ee92375))
* **dashboard:** add status filter for contacts ([45697cf](https://github.com/useplunk/plunk/commit/45697cf6b122266ec3ab35e51e064db48517448d))
* Email attachment support ([0e718d4](https://github.com/useplunk/plunk/commit/0e718d4dba1c8a258eb949cc0590ee14046c080a))
* Increase pagination limits to improve data display and update version to 1.2.1 ([4fe90ad](https://github.com/useplunk/plunk/commit/4fe90adf1e97c85afddeae0ad9e1ecc11dd0609b))
* Optimize data retrieval and add new indexes for performance improvements ([51b40cc](https://github.com/useplunk/plunk/commit/51b40cc06962ad98333a50ac7b4dbd82d8a3fe10))


### Bug Fixes

* Add fixed yarn version ([daa8285](https://github.com/useplunk/plunk/commit/daa8285af59c54c302b805e1d5afa0106567bbf4))
* Add fixed yarn version to Docker build ([ff5c6af](https://github.com/useplunk/plunk/commit/ff5c6af9d730a80d037a84454074dedda5709862))
* Add ref ([4c25a28](https://github.com/useplunk/plunk/commit/4c25a28d69f7f3719b1180924ef1c26958757ba5))
* Add target ([8ca5aea](https://github.com/useplunk/plunk/commit/8ca5aea0ea34f530595c7ec4e1f9b7514ba4e1a9))
* Added Migration ([e2d0d0e](https://github.com/useplunk/plunk/commit/e2d0d0eb0d2989e2668506c48fe55c0e41b29da3))
* Added try/catch to CRON ([c96a007](https://github.com/useplunk/plunk/commit/c96a0074f87f084801289cc9852f27221e4720e9))
* Check if APP_URI has https ([bad18ae](https://github.com/useplunk/plunk/commit/bad18ae559d582181d8c298f3c537c50b4b08851))
* clear Redis key on event deletion ([0ef39ce](https://github.com/useplunk/plunk/commit/0ef39ce3d2ad90be8e83ab97d5076f90642f3cc6))
* Correctly duplicate from ([111e054](https://github.com/useplunk/plunk/commit/111e054fe88997201ebf012602223c92f65d21a6))
* Force node-20 ([0b79bef](https://github.com/useplunk/plunk/commit/0b79bef2cb79cd3f8073884c9b84df733a696bad))
* incorrect domain verification records ([4bb38b9](https://github.com/useplunk/plunk/commit/4bb38b9f43cf495cf08ec6d95466e1b8cea409ce))
* incorrect schema in dashboard ([d69a57d](https://github.com/useplunk/plunk/commit/d69a57d71150e52e12cd1ed475dd16353d5ff9c1))
* move updating the contact to contacts controller ([7c8d3bb](https://github.com/useplunk/plunk/commit/7c8d3bb050fb0c35e0296eeb71d516f0c37329a2))
* Proper reset of contact ([7879e66](https://github.com/useplunk/plunk/commit/7879e6631e8a06020753d7a78583d4a1404b7684))
* refetch contact after awaiting triggers ([7202606](https://github.com/useplunk/plunk/commit/7202606aef0081a1e68f91df3b2e94e67e44ca39))
* refetch contact after awaiting triggers ([3f70be9](https://github.com/useplunk/plunk/commit/3f70be95dde80c04611089f66b1fcaa8eb30655e))
* Remove openssl install ([605a5a0](https://github.com/useplunk/plunk/commit/605a5a0abfbf0d11076440afc07d2f9b2d1ee071))
* return updated contact info ([115ac5f](https://github.com/useplunk/plunk/commit/115ac5fe6c87181fe33de367d88d01ef872ed2af))
* server crash in self-hosted instances ([ccb832d](https://github.com/useplunk/plunk/commit/ccb832d095de7d7b65ee07743ba8cf8025b86948))
* Show project `from` and `name` as backup ([d4bdcbf](https://github.com/useplunk/plunk/commit/d4bdcbf78ecfe7913128f8c5c90e36ee60eb6dca))
* Unlink domain properly executes ([f58149a](https://github.com/useplunk/plunk/commit/f58149a1b168cf931c2a2768345f2a8213fe27a1))
* Update yarn.lock ([ee1651e](https://github.com/useplunk/plunk/commit/ee1651e3902d879047082864a459ff63f7bee57d))
* Version ([5ca4567](https://github.com/useplunk/plunk/commit/5ca45677ffa181b9d288e42f69dc90a2498342af))
* Version ([3a5d05a](https://github.com/useplunk/plunk/commit/3a5d05a65ba38d4abe5f70be4fe1bd195290e055))
* Version ([42e865c](https://github.com/useplunk/plunk/commit/42e865ccbab7799c535a3c18ade4caddffd88f72))
* Version ([b742ab1](https://github.com/useplunk/plunk/commit/b742ab10eb34c52fbd9b9af32e36e3784c2d6fc8))


### Code Refactoring

* remove recipients from campaign data structure ([c40189e](https://github.com/useplunk/plunk/commit/c40189ebbdb80c7e24881191cb1b750d9faffbc1))
