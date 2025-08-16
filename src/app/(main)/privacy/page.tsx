
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicyPage() {
  return (
    <PageWrapper title="Privacy Policy">
      <div className="space-y-6 text-foreground/90 leading-relaxed">
        <p className="text-sm text-muted-foreground">Last updated: August 16, 2025</p>
        
        <Card>
          <CardHeader>
            <CardTitle>Introduction</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              This Privacy Policy explains how Peak Performance Labs Ltd ("we," "us," or "our") collects, uses, and discloses your information when you use our MealPreppyPro application (the "Service"). This policy is designed to comply with UK GDPR and other applicable privacy laws.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What Personal Data We Collect</CardTitle>
          </CardHeader>
          <CardContent>
            <p>We collect the following types of personal data:</p>
            <div className="space-y-4 mt-3">
              <div>
                <h4 className="font-semibold">Account Information:</h4>
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li>Email address, name, and encrypted password</li>
                  <li>Account preferences and settings</li>
                  <li>Subscription and billing information (if applicable)</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold">Profile Information:</h4>
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li>Age, weight, height, sex, and activity level</li>
                  <li>Dietary goals and preferences you provide</li>
                  <li>Food allergies and dietary restrictions</li>
                  <li>Macro targets and nutrition goals</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold">Health and Dietary Data:</h4>
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li>Meal plans, recipes, and food logs</li>
                  <li>Weight tracking data and progress measurements</li>
                  <li>Nutrition tracking and macro consumption</li>
                  <li>Pantry inventory and shopping lists</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Note:</strong> This health and dietary data is considered Special Category Data under UK GDPR, and we process it based on your explicit consent.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Usage Data:</h4>
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li>Information on how you interact with the Service</li>
                  <li>Features used, recipes viewed, and meal planning activity</li>
                  <li>Device information and technical data</li>
                  <li>Error logs and performance metrics</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Legal Basis for Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Our legal basis for processing your data is:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Consent:</strong> For creating your account, sending marketing communications, and processing any special category health and dietary data you provide. You may withdraw your consent at any time.</li>
              <li><strong>Performance of a Contract:</strong> To provide the core functionalities of the Service you have requested.</li>
              <li><strong>Legitimate Interests:</strong> To improve our Service, analyze usage patterns, and ensure security and performance.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How We Use Your Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p>We use your data to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Provide, operate, and maintain our Service</li>
              <li>Personalize your experience, such as filtering recipes and providing AI suggestions</li>
              <li>Generate meal plans and nutrition recommendations through our AI features</li>
              <li>Track your nutrition goals and provide progress insights</li>
              <li>Manage your pantry inventory and generate shopping lists</li>
              <li>Communicate with you, including for service-related announcements and customer support</li>
              <li>Process payments and manage subscriptions (if you upgrade to premium features)</li>
              <li>Improve our Service by analyzing usage patterns</li>
              <li>Ensure security and prevent fraud or abuse</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Features and Data Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p>
                MealPreppyPro includes AI-powered features ("Preppy") that provide personalized meal planning and nutrition recommendations. Here's how your data is used:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Meal Plan Generation:</strong> Your dietary preferences, macro targets, and available recipes are used to create personalized meal plans</li>
                <li><strong>Recipe Suggestions:</strong> Your pantry inventory and preferences are used to suggest suitable recipes</li>
                <li><strong>Recipe Modifications:</strong> AI analyzes your requests to modify existing recipes for dietary needs or preferences</li>
                <li><strong>Weekly Check-ins:</strong> Your progress data is analyzed to provide coaching insights and target adjustments</li>
                <li><strong>Third-Party AI Services:</strong> Some AI processing uses Google's Gemini AI service, with data processed temporarily and not stored permanently</li>
                <li><strong>No Training Data:</strong> Your personal data is not used to train AI models</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Security and Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p>
                We implement appropriate technical and organizational measures to protect your personal data, including:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Encryption of data in transit and at rest</li>
                <li>Secure authentication and access controls</li>
                <li>Regular security audits and updates</li>
                <li>Limited access to personal data on a need-to-know basis</li>
              </ul>
              <p className="mt-3">
                We will retain your personal data only for as long as is necessary to provide the Service to you or as required by law. You may delete your account at any time, which will result in the deletion of your personal data from our active systems within 30 days.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Third-Party Services</CardTitle>
          </CardHeader>
          <CardContent>
            <p>We use the following third-party services that may process your data:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Firebase:</strong> For database hosting, authentication, and backend infrastructure</li>
              <li><strong>Google AI (via Genkit):</strong> To power our AI features including Preppy's meal planning and recipe suggestions</li>
              <li><strong>Stripe:</strong> For secure payment processing and subscription management (premium features)</li>
              <li><strong>Vercel:</strong> For application hosting and content delivery</li>
              <li><strong>Sentry:</strong> For error tracking and performance monitoring</li>
            </ul>
            <p className="mt-3 text-sm text-muted-foreground">
              Each of these services has their own privacy policies and security measures. We only work with providers that meet high standards for data protection.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sharing Your Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              We do not sell, trade, or otherwise transfer your personal information to third parties except as described in this Privacy Policy. We may share your information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Service Providers:</strong> With trusted third-party services that help us operate our application</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets (with notice)</li>
              <li><strong>With Your Consent:</strong> When you explicitly agree to share information</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Rights</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Under UK GDPR, you have the right to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate personal data</li>
              <li><strong>Erasure:</strong> Request deletion of your personal data ('the right to be forgotten')</li>
              <li><strong>Restriction:</strong> Limit how we process your data</li>
              <li><strong>Data Portability:</strong> Receive your data in a structured, commonly used format</li>
              <li><strong>Object:</strong> Object to processing based on legitimate interests</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent for special category data processing at any time</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, please contact us at: <strong>peakperformancelabs@gmail.com</strong>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Children's Privacy</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              MealPreppyPro is not intended for individuals under 18 years of age. We do not knowingly collect personal information from children under 18. If we become aware that we have collected personal information from a child under 18, we will take steps to delete such information promptly.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>International Data Transfers</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Some of our service providers are located outside the UK/EEA. When we transfer your data internationally, we ensure appropriate safeguards are in place, including adequacy decisions, standard contractual clauses, or other approved mechanisms.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Changes to This Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and sending you an email notification. We encourage you to review this Privacy Policy periodically for any changes.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>If you have any questions about this Privacy Policy, please contact us:</p>
              <div className="bg-muted p-4 rounded-lg">
                <p><strong>Peak Performance Labs Ltd</strong></p>
                <p>Email: peakperformancelabs@gmail.com</p>
                </div>
              <p className="text-sm text-muted-foreground mt-3">
                You also have the right to lodge a complaint with the UK Information Commissioner's Office (ICO) if you believe we have not handled your personal data properly.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}