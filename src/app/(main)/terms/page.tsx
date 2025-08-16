import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsOfServicePage() {
  return (
    <PageWrapper title="Terms of Service">
      <div className="space-y-6 text-foreground/90 leading-relaxed">
        <p className="text-sm text-muted-foreground">Last updated: August 16, 2025</p>
        <p>Please read these Terms of Service ("Terms") carefully before using the MealPreppyPro application (the "Service") operated by [peakperformancelabsltd] ("us", "we", or "our").</p>

        <Card>
          <CardHeader>
            <CardTitle>1. Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              By accessing or using MealPreppyPro, you agree to be bound by these Terms. If you disagree with any part of these Terms, you may not access the Service. By using our Service, you represent that you are at least 18 years of age.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Description of Service</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              MealPreppyPro is an AI-powered meal planning and nutrition tracking application that provides recipe management, AI-generated nutrition recommendations, pantry management, shopping lists, progress tracking, and educational content about nutrition and meal planning.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Medical Disclaimer and No Health Advice</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold mb-2">3.1 No Medical Advice</h4>
                <p>
                  MealPreppyPro and all content, including recipes, nutrition calculations, AI suggestions, and meal plans, are provided for <strong>informational and educational purposes only</strong>. The Service is <strong>NOT intended to provide medical, nutritional, or health advice</strong>, and should not be used as a substitute for professional medical consultation, diagnosis, or treatment.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">3.2 Consult Healthcare Professionals</h4>
                <p>
                  <strong>Always consult with a qualified healthcare provider</strong> before starting any new diet, making significant changes to your eating habits, following AI-generated meal plans, or if you have any medical conditions, allergies, or dietary restrictions.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">3.3 Your Responsibility</h4>
                <p>
                  You acknowledge that you are solely responsible for all dietary and lifestyle decisions, will not rely solely on the app for nutrition guidance, will verify all nutritional information and recipe ingredients, and understand the limitations of AI-generated content.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Age Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              <strong>You must be at least 18 years old to use this Service.</strong> By using MealPreppyPro, you represent and warrant that you are at least 18 years of age. We do not knowingly collect personal information from individuals under 18. If we discover that a person under 18 has provided us with personal information, we will take steps to delete such information and terminate their account.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. User Responsibility and Assumption of Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p>
                You are solely responsible for the information you input into the app, including personal health data, allergies, intolerances, and dietary preferences. You acknowledge that you are voluntarily using our services and assume all risks associated with your dietary choices and activities.
              </p>
              <p>
                You are responsible for independently verifying that any recipes or ingredients suggested by the app are appropriate for your specific needs and do not contain any allergens or substances you wish to avoid.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. AI Services and Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold mb-2">6.1 AI-Generated Content</h4>
                <p>
                  Our AI features provide suggestions and recommendations based on the information you provide. AI suggestions are generated algorithmically and may not be suitable for your specific needs. AI-generated nutritional information should be verified independently, and AI recommendations are not personalized medical or nutritional advice.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">6.2 AI Limitations</h4>
                <p>
                  You acknowledge that AI-generated content may contain inaccuracies or errors, may not account for your specific health conditions or dietary needs, and requires verification by qualified professionals.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7. User Accounts and Prohibited Uses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p>
                To access certain features, you must create an account with accurate information. You are responsible for safeguarding your account credentials and for all activities under your account.
              </p>
              <p>
                You may not use MealPreppyPro to provide medical advice to others, share content promoting eating disorders, upload copyrighted recipes without permission, violate applicable laws, or interfere with the Service's operation.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>8. Subscription and Payment Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p>
                Certain features may require a paid subscription. Subscription fees are charged in advance and are non-refundable except as required by law. Subscriptions automatically renew unless cancelled.
              </p>
              <p>
                We may change subscription fees with 30 days' notice. You may cancel anytime through your account settings or by contacting us.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>9. Intellectual Property Rights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p>
                MealPreppyPro's software, design, and content are owned by us or our licensors and protected by intellectual property laws. You retain ownership of content you create, but grant us a license to use it solely to provide the Service.
              </p>
              <p>
                Recipe databases and nutritional information may be licensed from third parties. You may not extract, republish, or commercialize this data.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>10. Privacy and Data Protection</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your information. By using the Service, you consent to our data practices as described in the Privacy Policy.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>11. Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold mb-2">11.1 Disclaimer of Warranties</h4>
                <p>
                  THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">11.2 Limitation of Liability</h4>
                <p>
                  To the fullest extent permitted by applicable UK law, in no event shall we be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of or inability to use the service, any third-party conduct or content, or unauthorized access to your data.
                </p>
                <p className="mt-2">
                  <strong>Our total liability shall not exceed the greater of £100 or the amount you paid us in the 12 months preceding the claim.</strong>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>12. Indemnification</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              You agree to indemnify and hold us harmless from any claims, damages, or expenses arising from your use of the Service, violation of these Terms, violation of third-party rights, or any health/dietary decisions based on the Service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>13. Termination</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p>
                You may terminate your account at any time. We may terminate your access immediately for violation of these Terms, misuse of AI features, providing false information, or conduct that could harm users.
              </p>
              <p>
                Upon termination, your right to use the Service ceases, and we may delete your account data after a reasonable period.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>14. Dispute Resolution and Governing Law</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p>
                These Terms are governed by the laws of England and Wales. Any disputes shall be resolved through binding arbitration unless you qualify for small claims court.
              </p>
              <p>
                You agree not to participate in class action lawsuits against us.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>15. Modifications to Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              We may modify these Terms at any time. We will provide notice of material changes by posting updated Terms, sending email notification, or providing in-app notification. Continued use after modifications constitutes acceptance of the new Terms.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>16. General Provisions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p>
                If any provision is found unenforceable, the remaining provisions remain in effect. These Terms, together with our Privacy Policy, constitute the entire agreement between you and us.
              </p>
              <p>
                We may assign these Terms. You may not assign your rights without our written consent.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>17. Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              For questions about these Terms, contact us at:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Email: [INSERT_EMAIL]</li>
              <li>Address: [INSERT_ADDRESS]</li>
            </ul>
          </CardContent>
        </Card>

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium">
            By using MealPreppyPro, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </p>
        </div>
      </div>
    </PageWrapper>
  );
}