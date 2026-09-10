// Supplied boutique terms, with the owner's confirmed deposit and included-alterations corrections.
export type TermsBlock =
  { type: 'paragraph' | 'heading'; text: string } | { type: 'list'; items: string[] }

export const termsLastUpdated = '9 September 2026'

export const termsIntroduction: TermsBlock[] = [
  {
    type: 'paragraph',
    text: 'Welcome to CÁIT Bridal.',
  },
  {
    type: 'paragraph',
    text: 'These Terms & Conditions apply to wedding gowns, wedding dress rentals, accessories and related services provided by CÁIT Bridal.',
  },
  {
    type: 'paragraph',
    text: 'The CÁIT Bridal website is primarily an online catalogue, allowing customers to view wedding dress styles, information and prices.',
  },
  {
    type: 'paragraph',
    text: 'Wedding dresses are not purchased or rented directly through this website. All wedding gown purchases and rentals are arranged and confirmed directly with CÁIT Bridal in the boutique.',
  },
  {
    type: 'paragraph',
    text: 'Nothing in these Terms & Conditions excludes or limits any statutory consumer rights that cannot legally be excluded under Irish law.',
  },
]

export const termsSections: { title: string; blocks: TermsBlock[] }[] = [
  {
    title: '1. CÁIT BRIDAL WEBSITE',
    blocks: [
      {
        type: 'paragraph',
        text: 'The CÁIT Bridal website is provided primarily for information and catalogue purposes.',
      },
      {
        type: 'paragraph',
        text: 'Wedding gowns displayed on the website may be available:',
      },
      {
        type: 'list',
        items: ['to order for purchase; or', 'for rental where specifically indicated.'],
      },
      {
        type: 'paragraph',
        text: 'Displaying a gown on the website does not guarantee that the gown is immediately available to purchase or rent.',
      },
      {
        type: 'paragraph',
        text: 'Availability, sizes, production times, rental dates and final prices will be confirmed directly with CÁIT Bridal before any agreement is entered into.',
      },
      {
        type: 'paragraph',
        text: 'CÁIT Bridal makes reasonable efforts to ensure that photographs, descriptions and prices displayed on the website are accurate.',
      },
      {
        type: 'paragraph',
        text: 'However, colours, fabrics, lace, beading and other details may appear slightly different depending on photography, lighting and the Customer’s device or screen.',
      },
      {
        type: 'paragraph',
        text: 'If an obvious pricing or description error appears on the website, the correct information will be provided before the Customer enters into a purchase or rental agreement.',
      },
    ],
  },
  {
    title: '2. MADE-TO-ORDER WEDDING DRESSES',
    blocks: [
      {
        type: 'paragraph',
        text: 'Wedding dresses offered for purchase through CÁIT Bridal are generally made to order specifically for the individual Customer.',
      },
      {
        type: 'paragraph',
        text: 'After selecting a wedding gown in the boutique, the Customer’s measurements and/or appropriate manufacturer size will be taken or confirmed.',
      },
      {
        type: 'paragraph',
        text: 'The gown will then be specially ordered from the relevant designer or manufacturer for that Customer.',
      },
      {
        type: 'paragraph',
        text: 'Before the order is submitted, the Customer will be asked to confirm the relevant details, which may include:',
      },
      {
        type: 'list',
        items: [
          'selected gown/design;',
          'size and/or measurements;',
          'colour;',
          'agreed customisation;',
          'price; and',
          'other relevant order details.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Once the Customer has confirmed these details and CÁIT Bridal has submitted the order to the designer or manufacturer, changes may not be possible.',
      },
    ],
  },
  {
    title: '3. 50% DEPOSIT FOR WEDDING DRESS PURCHASES',
    blocks: [
      {
        type: 'paragraph',
        text: 'A 50% deposit of the total purchase price is required to confirm an order for a made-to-order wedding gown.',
      },
      {
        type: 'paragraph',
        text: 'The gown will not be ordered from the designer or manufacturer until the required deposit has been paid and the Customer has confirmed the relevant order details.',
      },
      {
        type: 'paragraph',
        text: 'Once the made-to-order gown has been ordered from the designer or manufacturer, the 50% deposit is non-refundable in the event of a change of mind or cancellation by the Customer, subject to the Customer’s statutory rights.',
      },
      {
        type: 'paragraph',
        text: 'The remaining 50% balance must be paid in accordance with the payment arrangements agreed with CÁIT Bridal and before the gown is released to the Customer.',
      },
    ],
  },
  {
    title: '4. RETURNS, EXCHANGES & CANCELLATIONS – MADE-TO-ORDER GOWNS',
    blocks: [
      {
        type: 'paragraph',
        text: 'Wedding gowns sold by CÁIT Bridal are specially ordered or manufactured for the individual Customer according to their selected design, size, measurements and/or agreed specifications.',
      },
      {
        type: 'paragraph',
        text: 'Once a made-to-order gown has been confirmed and ordered from the designer or manufacturer, it cannot be returned, exchanged or cancelled because of a change of mind.',
      },
      {
        type: 'paragraph',
        text: 'This includes situations where the Customer:',
      },
      {
        type: 'list',
        items: [
          'changes their mind about the gown;',
          'finds or prefers another gown;',
          'changes their preferred style or colour;',
          'changes or cancels their wedding;',
          'no longer requires the gown;',
          'loses or gains weight after measurements have been taken; or',
          'experiences another change in personal circumstances.',
        ],
      },
      {
        type: 'paragraph',
        text: 'This policy does not affect the Customer’s statutory rights where a gown is faulty, materially different from what was agreed, or otherwise does not conform with the contract.',
      },
    ],
  },
  {
    title: '5. MEASUREMENTS & SIZING',
    blocks: [
      {
        type: 'paragraph',
        text: 'Measurements and/or the appropriate manufacturer size will be confirmed before a made-to-order gown is ordered.',
      },
      {
        type: 'paragraph',
        text: 'Measurements represent the Customer’s measurements at the time they are taken.',
      },
      {
        type: 'paragraph',
        text: 'CÁIT Bridal cannot be responsible for subsequent changes to the Customer’s body measurements, including weight loss, weight gain, pregnancy or other physical changes after the gown has been ordered.',
      },
      {
        type: 'paragraph',
        text: 'Customers should be aware that bridal sizing can differ significantly from ordinary high-street clothing sizing.',
      },
      {
        type: 'paragraph',
        text: 'A made-to-order gown may still require alterations to achieve the Customer’s preferred final fit.',
      },
    ],
  },
  {
    title: '6. ALTERATIONS',
    blocks: [
      {
        type: 'paragraph',
        text: 'Every wedding dress, whether purchased or rented, is individually fitted and professionally altered for the Customer. Fitting and alterations are included in the purchase or rental price.',
      },
      {
        type: 'paragraph',
        text: 'We carry out the alterations needed to achieve the Customer’s final fit.',
      },
      {
        type: 'paragraph',
        text: 'The need for ordinary alterations does not in itself mean that a gown is faulty where the gown corresponds with the size, measurements and specifications agreed when the order was placed.',
      },
    ],
  },
  {
    title: '7. COLOUR, FABRIC & HANDMADE VARIATIONS',
    blocks: [
      {
        type: 'paragraph',
        text: 'Minor variations may occur between sample gowns, website photographs and newly manufactured gowns.',
      },
      {
        type: 'paragraph',
        text: 'These may arise from:',
      },
      {
        type: 'list',
        items: [
          'different fabric or lace batches;',
          'placement of lace or appliqués;',
          'handmade beading;',
          'embroidery;',
          'embellishments; or',
          'other normal manufacturing processes.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Minor variations of this nature are not necessarily defects.',
      },
    ],
  },
  {
    title: 'WEDDING DRESS RENTALS',
    blocks: [],
  },
  {
    title: '8. RENTAL PERIOD',
    blocks: [
      {
        type: 'paragraph',
        text: 'Selected CÁIT Bridal wedding gowns are available for rental.',
      },
      {
        type: 'paragraph',
        text: 'The standard rental period is three (3) days.',
      },
      {
        type: 'paragraph',
        text: 'The exact collection and return dates and times will be agreed with the Customer and recorded in the CÁIT Bridal Wedding Dress Rental Agreement.',
      },
      {
        type: 'paragraph',
        text: 'Any extension must be agreed with CÁIT Bridal in advance and is subject to availability.',
      },
      {
        type: 'paragraph',
        text: 'All rented wedding dresses and accessories remain the property of CÁIT Bridal at all times.',
      },
    ],
  },
  {
    title: '9. RENTAL PAYMENT',
    blocks: [
      {
        type: 'paragraph',
        text: 'The full rental price must be paid before the wedding dress is released to the Customer.',
      },
      {
        type: 'paragraph',
        text: 'In addition to the rental price, a refundable Security Deposit is required. The applicable amount is shown for the selected gown and confirmed in the individual Rental Agreement.',
      },
      {
        type: 'paragraph',
        text: 'The rental payment provides temporary use of the selected gown for the agreed rental period and does not transfer ownership of the gown to the Customer.',
      },
    ],
  },
  {
    title: '10. REFUNDABLE SECURITY DEPOSIT',
    blocks: [
      {
        type: 'paragraph',
        text: 'Every wedding gown rental requires the agreed refundable Security Deposit in addition to the rental price.',
      },
      {
        type: 'paragraph',
        text: 'Following return, CÁIT Bridal will inspect the wedding dress and any included accessories.',
      },
      {
        type: 'paragraph',
        text: 'The full Security Deposit will be refunded where:',
      },
      {
        type: 'list',
        items: [
          'the gown and included accessories are returned;',
          'they are returned by the agreed date and time;',
          'there is no damage beyond reasonable normal wedding-day wear;',
          'no rented items are missing; and',
          'no exceptional repair or specialist cleaning is required because of damage or misuse.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Where reasonable repair, exceptional specialist cleaning or replacement of a damaged or missing component is required, CÁIT Bridal may deduct the reasonable cost from the Security Deposit.',
      },
      {
        type: 'paragraph',
        text: 'Where that cost is less than the Security Deposit paid, the remaining balance will be refunded to the Customer.',
      },
      {
        type: 'paragraph',
        text: 'CÁIT Bridal will not automatically retain the entire Security Deposit for minor damage where the reasonable cost of addressing the damage is lower.',
      },
    ],
  },
  {
    title: '11. SERIOUS DAMAGE, LOSS OR NON-RETURN',
    blocks: [
      {
        type: 'paragraph',
        text: 'The Security Deposit does not necessarily represent the maximum amount for which a Customer may be responsible.',
      },
      {
        type: 'paragraph',
        text: 'Where a rented gown or accessory is:',
      },
      {
        type: 'list',
        items: [
          'lost;',
          'not returned;',
          'stolen while in the Customer’s possession;',
          'intentionally or recklessly damaged; or',
          'damaged to such an extent that it cannot reasonably or economically be restored for future rental,',
        ],
      },
      {
        type: 'paragraph',
        text: 'the Customer may be responsible for reasonable additional loss or replacement costs, taking account of the item’s age, condition and circumstances.',
      },
      {
        type: 'paragraph',
        text: 'Full details will be included in the individual Wedding Dress Rental Agreement.',
      },
    ],
  },
  {
    title: '12. PROFESSIONAL CLEANING',
    blocks: [
      {
        type: 'paragraph',
        text: 'Normal professional cleaning following ordinary wedding-day use is included in the rental price.',
      },
      {
        type: 'paragraph',
        text: 'Customers are not required to clean the gown before returning it.',
      },
      {
        type: 'paragraph',
        text: 'Rental gowns must not be independently washed or dry-cleaned by the Customer unless specifically authorised by CÁIT Bridal.',
      },
      {
        type: 'paragraph',
        text: 'CÁIT Bridal understands that a wedding gown is being rented to be worn and enjoyed during a wedding or event.',
      },
      {
        type: 'paragraph',
        text: 'Reasonable normal wear, ordinary marks and normal wedding-day soiling that can be addressed through standard professional cleaning will not normally result in a deduction from the Security Deposit.',
      },
      {
        type: 'paragraph',
        text: 'Where exceptional specialist cleaning is required because of significant staining, misuse or damage beyond reasonable normal wear, the reasonable additional cost may be deducted from the Security Deposit.',
      },
    ],
  },
  {
    title: '13. CARE & DAMAGE',
    blocks: [
      {
        type: 'paragraph',
        text: 'Customers are required to take reasonable care of rented gowns and accessories.',
      },
      {
        type: 'paragraph',
        text: 'Without prior permission from CÁIT Bridal, a rented gown must not be:',
      },
      {
        type: 'list',
        items: [
          'cut;',
          'permanently altered;',
          'dyed or bleached;',
          'glued;',
          'permanently modified;',
          'independently washed or dry-cleaned;',
          'have lace, beading or embellishments removed; or',
          'be permanently repaired or altered by another person or business.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Customers may be responsible for reasonable repair costs where damage exceeds normal wedding-day wear.',
      },
      {
        type: 'paragraph',
        text: 'Examples may include significant tears, broken zips or fastenings, burns, cut fabric, substantial lace damage, missing embellishments or permanent staining.',
      },
    ],
  },
  {
    title: '14. VEILS & ACCESSORIES',
    blocks: [
      {
        type: 'paragraph',
        text: 'A veil may be included with selected wedding gown rentals where specifically agreed with CÁIT Bridal.',
      },
      {
        type: 'paragraph',
        text: 'A veil is not automatically included with every rental.',
      },
      {
        type: 'paragraph',
        text: 'Any veil or additional accessory included in a rental will be recorded in the individual Wedding Dress Rental Agreement.',
      },
      {
        type: 'paragraph',
        text: 'Included accessories must be returned together with the gown and are subject to the same reasonable care requirements.',
      },
      {
        type: 'paragraph',
        text: 'Loss or significant damage may result in reasonable repair or replacement costs.',
      },
    ],
  },
  {
    title: '15. RENTAL CANCELLATION POLICY',
    blocks: [
      {
        type: 'paragraph',
        text: 'Once a wedding gown has been reserved for a Customer and a particular wedding or event date, it is removed from availability for other customers for the relevant rental period.',
      },
      {
        type: 'paragraph',
        text: 'For this reason, the following cancellation policy applies.',
      },
      {
        type: 'heading',
        text: 'More Than 14 Days Before Collection',
      },
      {
        type: 'paragraph',
        text: 'Where written cancellation is received more than 14 days before the agreed collection date, the Customer will receive:',
      },
      {
        type: 'paragraph',
        text: '100% refund of the rental fee.',
      },
      {
        type: 'paragraph',
        text: 'Any Security Deposit already paid will also be refunded in full.',
      },
      {
        type: 'heading',
        text: '14 Days or Less, But More Than 48 Hours Before Collection',
      },
      {
        type: 'paragraph',
        text: 'Where written cancellation is received 14 days or less, but more than 48 hours before the agreed collection time, the Customer will receive:',
      },
      {
        type: 'paragraph',
        text: '50% refund of the rental fee.',
      },
      {
        type: 'paragraph',
        text: 'The remaining 50% may be retained by CÁIT Bridal because the gown was reserved for the Customer and unavailable for other bookings.',
      },
      {
        type: 'paragraph',
        text: 'The Security Deposit will be refunded in full.',
      },
      {
        type: 'heading',
        text: '48 Hours or Less Before Collection',
      },
      {
        type: 'paragraph',
        text: 'Where cancellation occurs 48 hours or less before the agreed collection time:',
      },
      {
        type: 'paragraph',
        text: 'The rental fee is non-refundable.',
      },
      {
        type: 'paragraph',
        text: 'The Security Deposit will be refunded in full, provided the gown has not been released to the Customer.',
      },
      {
        type: 'heading',
        text: 'No-Show / Failure to Collect',
      },
      {
        type: 'paragraph',
        text: 'Where the Customer does not collect the reserved gown and has not cancelled the booking:',
      },
      {
        type: 'paragraph',
        text: 'The rental fee is non-refundable.',
      },
      {
        type: 'paragraph',
        text: 'The Security Deposit will be refunded because the gown has not entered the Customer’s possession.',
      },
      {
        type: 'heading',
        text: 'How to Cancel',
      },
      {
        type: 'paragraph',
        text: 'Cancellation must be communicated to CÁIT Bridal in writing, including by email, text message or another written communication method accepted by CÁIT Bridal.',
      },
      {
        type: 'paragraph',
        text: 'The date and time on which CÁIT Bridal receives the written cancellation will determine the applicable refund.',
      },
      {
        type: 'paragraph',
        text: 'Nothing in this Cancellation Policy affects mandatory statutory rights.',
      },
    ],
  },
  {
    title: '16. CHANGE OF WEDDING DATE',
    blocks: [
      {
        type: 'paragraph',
        text: 'CÁIT Bridal understands that wedding dates can sometimes change.',
      },
      {
        type: 'paragraph',
        text: 'A Customer may request one change of rental date without an additional rescheduling fee, subject to the selected gown being available for the requested new date.',
      },
      {
        type: 'paragraph',
        text: 'Where possible, at least 14 days’ notice should be provided.',
      },
      {
        type: 'paragraph',
        text: 'If the selected gown is already reserved for another Customer on the new requested date, CÁIT Bridal cannot guarantee availability but may offer an alternative gown where possible.',
      },
      {
        type: 'paragraph',
        text: 'A subsequent change of date may be treated as a cancellation and new rental booking.',
      },
    ],
  },
  {
    title: '17. LATE RETURN',
    blocks: [
      {
        type: 'paragraph',
        text: 'Rented gowns and accessories must be returned by the agreed date and time.',
      },
      {
        type: 'paragraph',
        text: 'Timely return is important because gowns may require professional cleaning and preparation before another confirmed rental.',
      },
      {
        type: 'paragraph',
        text: 'Where a Customer expects a delay, they should contact CÁIT Bridal as soon as possible.',
      },
      {
        type: 'paragraph',
        text: 'An unauthorised late return may result in a reasonable late return charge, as specified in the individual Rental Agreement.',
      },
    ],
  },
  {
    title: '18. RENTAL AGREEMENT & CONDITION INSPECTION',
    blocks: [
      {
        type: 'paragraph',
        text: 'Every wedding dress rental is subject to a separate CÁIT Bridal Wedding Dress Rental Agreement.',
      },
      {
        type: 'paragraph',
        text: 'The Agreement records important information including:',
      },
      {
        type: 'list',
        items: [
          'the specific gown;',
          'rental price;',
          'Security Deposit;',
          'three-day rental period;',
          'collection and return dates;',
          'included veil/accessories;',
          'condition of the gown;',
          'cancellation conditions;',
          'damage responsibilities; and',
          'return inspection.',
        ],
      },
      {
        type: 'paragraph',
        text: 'The Customer will have an opportunity to inspect the gown before collection.',
      },
      {
        type: 'paragraph',
        text: 'CÁIT Bridal may photograph the gown before collection and following return to document its condition.',
      },
      {
        type: 'paragraph',
        text: 'Customers will not be responsible for pre-existing damage that was identified and recorded before collection.',
      },
    ],
  },
  {
    title: '19. CANCELLATION BY CÁIT BRIDAL',
    blocks: [
      {
        type: 'paragraph',
        text: 'In the unlikely event that CÁIT Bridal is unable to provide a reserved rental gown due to circumstances for which CÁIT Bridal is responsible, the Customer will be offered, where reasonably possible:',
      },
      {
        type: 'list',
        items: [
          'a suitable alternative gown acceptable to the Customer; or',
          'a full refund of the rental payment and Security Deposit paid for the affected rental.',
        ],
      },
      {
        type: 'paragraph',
        text: 'This does not affect statutory rights or remedies.',
      },
    ],
  },
  {
    title: '20. ACCESSORIES FOR PURCHASE',
    blocks: [
      {
        type: 'paragraph',
        text: 'Veils, jewellery and other bridal accessories may also be available separately for purchase.',
      },
      {
        type: 'paragraph',
        text: 'Any applicable purchase, order, return or exchange conditions will be communicated before the Customer completes the purchase.',
      },
      {
        type: 'paragraph',
        text: 'Where an accessory is personalised, specially ordered or made to the Customer’s specifications, different cancellation or change-of-mind conditions may apply.',
      },
      {
        type: 'paragraph',
        text: 'This does not affect statutory rights in relation to faulty or non-conforming goods.',
      },
    ],
  },
  {
    title: '21. ORDER & DELIVERY TIMES',
    blocks: [
      {
        type: 'paragraph',
        text: 'Production and delivery times for made-to-order gowns are estimates unless expressly agreed otherwise.',
      },
      {
        type: 'paragraph',
        text: 'CÁIT Bridal works with third-party designers, manufacturers and delivery providers.',
      },
      {
        type: 'paragraph',
        text: 'Where CÁIT Bridal becomes aware of a significant delay affecting a Customer’s gown, the Customer will be contacted as soon as reasonably possible.',
      },
      {
        type: 'paragraph',
        text: 'Nothing in this section limits any mandatory rights the Customer may have under Irish consumer law.',
      },
    ],
  },
  {
    title: '22. WEBSITE PRICES & AVAILABILITY',
    blocks: [
      {
        type: 'paragraph',
        text: 'CÁIT Bridal makes reasonable efforts to keep website prices and information accurate.',
      },
      {
        type: 'paragraph',
        text: 'Website prices may be updated from time to time.',
      },
      {
        type: 'paragraph',
        text: 'The applicable price and availability will be confirmed with the Customer before entering into a purchase or rental agreement.',
      },
      {
        type: 'paragraph',
        text: 'An obvious website pricing error does not require CÁIT Bridal to enter into an agreement at the incorrect price where the error is identified before the contract is concluded.',
      },
    ],
  },
  {
    title: '23. PHOTOGRAPHS & SOCIAL MEDIA',
    blocks: [
      {
        type: 'paragraph',
        text: 'CÁIT Bridal will not intentionally use identifiable photographs or videos of Customers for marketing or social media purposes without appropriate permission.',
      },
      {
        type: 'paragraph',
        text: 'Permission may be requested where CÁIT Bridal would like to share a Customer’s wedding photographs, fitting photographs or other identifiable content for promotional purposes.',
      },
    ],
  },
  {
    title: '24. PRIVACY',
    blocks: [
      {
        type: 'paragraph',
        text: 'Personal information supplied to CÁIT Bridal will be processed in accordance with applicable data protection law and the CÁIT Bridal Privacy Policy.',
      },
      {
        type: 'paragraph',
        text: 'Where reasonably necessary to fulfil an order or service, relevant information may be shared with designers, manufacturers, alteration providers, delivery providers or other appropriate service providers.',
      },
      {
        type: 'paragraph',
        text: 'Further information is available in the CÁIT Bridal Privacy Policy.',
      },
    ],
  },
  {
    title: '25. COMPLAINTS & CUSTOMER SERVICE',
    blocks: [
      {
        type: 'paragraph',
        text: 'If a Customer has a concern regarding a purchase, rental or service, they should contact CÁIT Bridal as soon as reasonably possible so that the matter can be reviewed.',
      },
      {
        type: 'paragraph',
        text: "Boutique Address: \nJOHN'S PLACE\nBIRR\nCO. OFFALY\nR42 YX50\nEmail: sales@caitbridal.ie\nTelephone: +353833315515",
      },
      {
        type: 'paragraph',
        text: 'Customers should provide their name, relevant order or rental details and a description of the issue.',
      },
    ],
  },
  {
    title: '26. STATUTORY CONSUMER RIGHTS',
    blocks: [
      {
        type: 'paragraph',
        text: 'Nothing in these Terms & Conditions is intended to exclude, restrict or override any statutory consumer right or remedy that cannot legally be excluded under Irish law.',
      },
      {
        type: 'paragraph',
        text: 'Where a purchased gown or product is faulty, materially different from what was agreed, not as described or otherwise does not conform with the contract, the Customer’s rights will be dealt with in accordance with applicable Irish consumer law.',
      },
      {
        type: 'paragraph',
        text: 'The fact that a gown is made to order does not remove statutory rights relating to faulty or non-conforming goods.',
      },
    ],
  },
  {
    title: '27. GOVERNING LAW',
    blocks: [
      {
        type: 'paragraph',
        text: 'These Terms & Conditions are governed by the laws of Ireland.',
      },
      {
        type: 'paragraph',
        text: 'Nothing contained in these Terms & Conditions excludes or limits any mandatory consumer rights or remedies available under Irish law.',
      },
    ],
  },
  {
    title: 'CÁIT BRIDAL',
    blocks: [
      {
        type: 'paragraph',
        text: "Website: caitbridal.ie\nBoutique Address: \nJOHN'S PLACE\nBIRR\nCO. OFFALY\nR42 YX50\nEmail: [sales@caitbridal.ie]\nTelephone: [+353833315515]",
      },
      {
        type: 'paragraph',
        text: 'Last updated: 9 September 2026',
      },
    ],
  },
]
