import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { courseId, userId, price, title, email } = body;

    if (!courseId || !userId || !price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const secretKey = process.env.NEXT_PUBLIC_XENDIT_SECRET_KEY;
    if (!secretKey) {
      console.error('XENDIT_SECRET_KEY is not set in environment variables');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const externalId = `invoice_${userId}_${courseId}_${Date.now()}`;

    // Prepare payload for Xendit API
    const payload = {
      external_id: externalId,
      amount: price,
      description: `Purchase for course: ${title}`,
      payer_email: email || undefined,
      success_redirect_url: `${baseUrl}/user/view-course/${courseId}?payment_status=success`,
      failure_redirect_url: `${baseUrl}/user/view-course/${courseId}?payment_status=failure`,
      metadata: {
        userId,
        courseId
      }
    };

    const response = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Xendit error:', data);
      return NextResponse.json({ error: data.message || 'Failed to create invoice' }, { status: response.status });
    }

    return NextResponse.json({ invoiceUrl: data.invoice_url }, { status: 200 });
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}