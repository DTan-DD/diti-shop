import { Body, Container, Head, Heading, Html, Preview, Section, Text, Tailwind } from "@react-email/components";

interface ChangeEmailSecurityAlertProps {
  userName: string;
  oldEmail: string;
  newEmail: string;
  actionTime?: string; // optional: thời gian đổi email
}

export default function ChangeEmailSecurityAlertEmail({ userName, oldEmail, newEmail, actionTime }: ChangeEmailSecurityAlertProps) {
  return (
    <Html>
      <Preview>Cảnh báo bảo mật: Email tài khoản vừa thay đổi</Preview>
      <Tailwind>
        <Head />
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto py-8 px-4">
            <Section className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
              <Heading className="text-2xl font-bold text-center text-gray-800 mb-4">🚨 Cảnh báo bảo mật</Heading>

              <Text className="text-gray-600 mb-4">
                Xin chào <strong>{userName}</strong>,
              </Text>

              <Text className="text-gray-600 mb-4">
                Email tài khoản của bạn vừa được thay đổi từ <strong>{oldEmail}</strong> sang <strong>{newEmail}</strong>.
              </Text>

              {actionTime && <Text className="text-gray-500 text-sm mb-4">Thời gian thực hiện: {actionTime}</Text>}

              <Section className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                <Text className="text-sm font-semibold text-red-800 mb-2">⚠️ Lưu ý bảo mật:</Text>
                <Text className="text-sm text-red-700 mb-1">
                  • Nếu bạn <strong>không yêu cầu</strong> thay đổi này, tài khoản của bạn có thể bị xâm nhập.
                </Text>
                <Text className="text-sm text-red-700 mb-1">• Ngay lập tức đăng nhập và thay đổi mật khẩu để bảo vệ tài khoản.</Text>
                <Text className="text-sm text-red-700 mb-1">• Không chia sẻ thông tin đăng nhập với bất kỳ ai.</Text>
                <Text className="text-sm text-red-700 mb-0">• Nếu nghi ngờ, liên hệ bộ phận hỗ trợ ngay lập tức.</Text>
              </Section>

              <Text className="text-gray-500 text-sm text-center mt-8">Đây là email cảnh báo bảo mật gửi đến email cũ để bảo vệ tài khoản của bạn.</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
