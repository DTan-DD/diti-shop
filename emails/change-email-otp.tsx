import { Body, Container, Head, Heading, Html, Preview, Section, Text, Tailwind } from "@react-email/components";
import { OTP_CONFIG } from "@/lib/constants";

interface ChangeEmailOTPProps {
  otp: string;
  userName: string;
  oldEmail: string;
  newEmail: string;
}

export default function ChangeEmailOTPEmail({ otp, userName, oldEmail, newEmail }: ChangeEmailOTPProps) {
  return (
    <Html>
      <Preview>Xác thực thay đổi email</Preview>
      <Tailwind>
        <Head />
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto py-8 px-4">
            <Section className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
              <Heading className="text-2xl font-bold text-center text-gray-800 mb-4">Xác thực thay đổi email</Heading>

              <Text className="text-gray-600 mb-4">
                Xin chào <strong>{userName}</strong>,
              </Text>

              <Text className="text-gray-600 mb-4">Bạn đã yêu cầu thay đổi email từ:</Text>

              <Section className="bg-gray-50 rounded-lg p-4 mb-4">
                <Text className="text-sm mb-1">
                  <strong>Email cũ:</strong> {oldEmail}
                </Text>
                <Text className="text-sm mb-0">
                  <strong>Email mới:</strong> {newEmail}
                </Text>
              </Section>

              <Text className="text-gray-600 mb-6">Vui lòng sử dụng mã OTP bên dưới để xác nhận thay đổi:</Text>

              {/* OTP Display */}
              <Section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 my-8 text-center border-2 border-dashed border-blue-300">
                <Text className="text-4xl font-bold tracking-widest text-gray-800 mb-2">{otp}</Text>
                <Text className="text-sm text-gray-600">Mã OTP của bạn</Text>
              </Section>

              {/* Expiry Warning */}
              <Section className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <Text className="text-sm text-yellow-800 mb-0">
                  ⏰ <strong>Lưu ý:</strong> Mã này sẽ hết hạn sau {OTP_CONFIG.EXPIRY_MINUTES} phút.
                </Text>
              </Section>

              {/* Security Warning */}
              <Section className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                <Text className="text-sm font-semibold text-red-800 mb-2">🚨 Cảnh báo bảo mật:</Text>
                <Text className="text-sm text-red-700 mb-1">• Nếu bạn không yêu cầu thay đổi này, hãy bỏ qua email</Text>
                <Text className="text-sm text-red-700 mb-1">• Không chia sẻ mã OTP với bất kỳ ai</Text>
                <Text className="text-sm text-red-700 mb-0">• Thay đổi mật khẩu ngay nếu bạn nghi ngờ tài khoản bị xâm nhập</Text>
              </Section>

              <Text className="text-gray-500 text-sm text-center mt-8">Email này được gửi đến cả email cũ và email mới để bảo mật.</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
