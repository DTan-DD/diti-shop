import { Body, Container, Head, Heading, Html, Preview, Section, Text, Tailwind } from "@react-email/components";
import { OTP_CONFIG } from "@/lib/constants";

interface OTPVerificationEmailProps {
  otp: string;
  userName: string;
}

export default function OTPVerificationEmail({ otp, userName }: OTPVerificationEmailProps) {
  return (
    <Html>
      <Preview>Mã xác thực OTP của bạn</Preview>
      <Tailwind>
        <Head />
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto py-8 px-4">
            <Section className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
              <Heading className="text-2xl font-bold text-center text-gray-800 mb-4">Xác thực tài khoản</Heading>

              <Text className="text-gray-600 mb-6">
                Xin chào <strong>{userName}</strong>,
              </Text>

              <Text className="text-gray-600 mb-6">Cảm ơn bạn đã đăng ký! Vui lòng sử dụng mã OTP bên dưới để hoàn tất đăng ký:</Text>

              {/* OTP Display */}
              <Section className="bg-gray-50 rounded-lg p-6 my-8 text-center border-2 border-dashed border-gray-300">
                <Text className="text-4xl font-bold tracking-widest text-gray-800 mb-2">{otp}</Text>
                <Text className="text-sm text-gray-500">Mã OTP của bạn</Text>
              </Section>

              {/* Expiry Warning */}
              <Section className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <Text className="text-sm text-yellow-800 mb-0">
                  ⏰ <strong>Lưu ý:</strong> Mã này sẽ hết hạn sau {OTP_CONFIG.EXPIRY_MINUTES} phút.
                </Text>
              </Section>

              {/* Security Tips */}
              <Section className="bg-blue-50 rounded-lg p-4 mb-6">
                <Text className="text-sm font-semibold text-blue-800 mb-2">🔒 Bảo mật:</Text>
                <Text className="text-sm text-blue-700 mb-1">• Không chia sẻ mã này với bất kỳ ai</Text>
                <Text className="text-sm text-blue-700 mb-1">• Nhân viên của chúng tôi sẽ không bao giờ hỏi mã OTP</Text>
                <Text className="text-sm text-blue-700 mb-0">• Nếu bạn không yêu cầu mã này, hãy bỏ qua email</Text>
              </Section>

              <Text className="text-gray-500 text-sm text-center mt-8">Nếu bạn cần hỗ trợ, vui lòng liên hệ với chúng tôi.</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
