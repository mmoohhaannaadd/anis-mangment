import type { CartItem } from '../store/cartStore';

export const generateWhatsAppLink = (items: CartItem[], totalAmount: number, clientName: string, adminPhone: string, currency: string) => {
  let message = `مرحباً، أود إرسال طلب جديد من المتجر:\n\n`;
  message += `مقدم الطلب: *${clientName}*\n`;
  message += `------------------------\n`;

  items.forEach((item, index) => {
    message += `${index + 1}. ${item.product.name}\n`;
    message += `   الكمية: ${item.quantity} ${item.product.unit}\n`;
    message += `   السعر الإجمالي: ${item.product.sellPrice * item.quantity} ${currency}\n`;
  });

  message += `------------------------\n`;
  message += `إجمالي الطلب: *${totalAmount} ${currency}*\n\n`;
  message += `الرجاء تأكيد الطلب. شكراً لك!`;

  // remove non-numeric characters from the phone number
  const cleanPhone = adminPhone.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
};
