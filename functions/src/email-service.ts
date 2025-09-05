import nodemailer from 'nodemailer';

// メール送信設定
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

/**
 * 秘密鍵をメールで送信
 */
export async function sendSecretKeyEmail(
  email: string, 
  secretKey: string, 
  labels: {
    tenantId: string;
    lpId: string;
    productType: string;
    orderId: string;
  }
) {
  const productTypeNames = {
    'acrylic': 'NFCタグ付きアクリルスタンド',
    'digital': 'デジタル想い出ページ',
    'premium': 'プレミアム想い出サービス',
    'standard': 'スタンダード想い出サービス'
  };

  const mailOptions = {
    from: 'noreply@emolink.net',
    to: email,
    subject: 'CMS - 秘密鍵のお知らせ',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; text-align: center;">CMS - 秘密鍵</h2>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="font-size: 16px; color: #555;">
            決済が完了しました。以下の秘密鍵でCMSにログインしてください。
          </p>
        </div>
        
        <div style="background: #f5f5f5; padding: 20px; text-align: center; font-family: monospace; font-size: 18px; letter-spacing: 2px; border-radius: 8px; margin: 20px 0;">
          <strong style="color: #0066cc;">${secretKey}</strong>
        </div>
        
        <div style="margin: 20px 0; padding: 15px; background: #f0f8ff; border-left: 4px solid #0066cc; border-radius: 4px;">
          <h3 style="color: #0066cc; margin-top: 0;">注文詳細</h3>
          <p><strong>プロダクト:</strong> ${productTypeNames[labels.productType as keyof typeof productTypeNames] || labels.productType}</p>
          <p><strong>テナント:</strong> ${labels.tenantId}</p>
          <p><strong>LP:</strong> ${labels.lpId}</p>
          <p><strong>注文ID:</strong> ${labels.orderId}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://emolink.net" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            CMSにアクセス
          </a>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            <strong>重要:</strong> この秘密鍵は30日間有効です。一度使用すると無効になります。
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>このメールは自動送信されています。返信はできません。</p>
          <p>ご質問がございましたら、サポートまでお問い合わせください。</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Secret key email sent successfully to:', email);
  } catch (error) {
    console.error('Error sending secret key email:', error);
    throw error;
  }
}

/**
 * 注文完了通知メール
 */
export async function sendOrderCompletionEmail(
  email: string,
  orderId: string,
  shippingInfo: {
    trackingNumber?: string;
    estimatedDelivery?: string;
  }
) {
  const mailOptions = {
    from: 'noreply@emolink.net',
    to: email,
    subject: 'CMS - 注文完了のお知らせ',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; text-align: center;">注文完了のお知らせ</h2>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="font-size: 16px; color: #555;">
            ご注文いただいた商品の制作が完了し、配送を開始いたしました。
          </p>
        </div>
        
        <div style="margin: 20px 0; padding: 15px; background: #f0f8ff; border-left: 4px solid #0066cc; border-radius: 4px;">
          <h3 style="color: #0066cc; margin-top: 0;">配送情報</h3>
          <p><strong>注文ID:</strong> ${orderId}</p>
          ${shippingInfo.trackingNumber ? `<p><strong>追跡番号:</strong> ${shippingInfo.trackingNumber}</p>` : ''}
          ${shippingInfo.estimatedDelivery ? `<p><strong>お届け予定:</strong> ${shippingInfo.estimatedDelivery}</p>` : ''}
        </div>
        
        <div style="background: #d4edda; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0; color: #155724; font-size: 14px;">
            <strong>ご注意:</strong> 商品到着後、CMSで想い出ページの編集が可能になります。
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>このメールは自動送信されています。返信はできません。</p>
          <p>ご質問がございましたら、サポートまでお問い合わせください。</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Order completion email sent successfully to:', email);
  } catch (error) {
    console.error('Error sending order completion email:', error);
    throw error;
  }
}
