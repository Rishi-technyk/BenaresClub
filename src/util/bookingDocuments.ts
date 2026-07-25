import { Toast } from 'react-native-toast-notifications';
import { generatePDF } from 'react-native-html-to-pdf';
import Share from 'react-native-share';

type BookingLine = {
  label: string;
  value?: string | number | null;
};

export const createBookingSummaryPdf = async (
  title: string,
  subtitle: string,
  rows: BookingLine[],
) => {
  const htmlRows = rows
    .map(
      row => `
        <tr>
          <td style="padding:10px 0;color:#475569;font-size:13px;border-bottom:1px solid #e2e8f0;">${row.label}</td>
          <td style="padding:10px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;border-bottom:1px solid #e2e8f0;">${row.value ?? 'N/A'}</td>
        </tr>
      `,
    )
    .join('');

  return generatePDF({
    html: `
      <html>
        <body style="font-family: Helvetica; padding: 28px;">
          <div style="padding: 24px; border-radius: 18px; background: #0f172a; color: white;">
            <div style="font-size: 12px; letter-spacing: 1px; text-transform: uppercase; opacity: 0.8;">Booking Summary</div>
            <h1 style="margin: 10px 0 6px; font-size: 28px;">${title}</h1>
            <p style="margin: 0; font-size: 14px; opacity: 0.85;">${subtitle}</p>
          </div>
          <table style="width:100%; margin-top: 18px; border-collapse: collapse;">
            ${htmlRows}
          </table>
        </body>
      </html>
    `,
    fileName: title.replace(/\s+/g, '_').toLowerCase(),
    base64: false,
  });
};

export const shareBookingSummary = async (
  title: string,
  subtitle: string,
  rows: BookingLine[],
) => {
  const file = await createBookingSummaryPdf(title, subtitle, rows);

  if (!file?.filePath) {
    Toast.show('Unable to prepare booking summary right now.', { type: 'danger' });
    return;
  }

  await Share.open({
    title,
    url: `file://${file.filePath}`,
    type: 'application/pdf',
  });
};
