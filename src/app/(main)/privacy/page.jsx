import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
export default function PrivacyPolicyPage() {
    return (<PageWrapper title="Privacy Policy">
      <div className="space-y-6 text-foreground/90 leading-relaxed">
        <Card>
          <CardHeader>
            <CardTitle>Introduction</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              This Privacy Policy explains how MealPlannerPro Ltd. ("we," "us," or "our") collects, uses, and discloses your information when you use our MealPlannerPro application (the "Service"). This policy is designed to comply with UK GDPR.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What Personal Data We Collect</CardTitle>
          </CardHeader>
          <CardContent>
            <p>We collect the following types of personal data:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Account Information:</strong> Email address, name, and encrypted password.</li>
              <li><strong>Profile Information:</strong> Age, weight, height, sex, activity level, and dietary goals you provide.</li>
              <li><strong>Health and Dietary Data:</strong> Information you voluntarily provide about dietary preferences, allergens, macro targets, and meal plans. This is considered Special Category Data under UK GDPR, and we process it based on your explicit consent.</li>
              <li><strong>Usage Data:</strong> Information on how you interact with the Service, such as features used and recipes viewed.</li>
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Legal Basis for Processing</CardTitle>
          </CardHeader>
          <CardContent>
             <p>Our legal basis for processing your data is:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Consent:</strong> For creating your account, sending marketing communications, and processing any special category health data you provide. You may withdraw your consent at any time.</li>
              <li><strong>Performance of a Contract:</strong> To provide the core functionalities of the Service you have requested.</li>
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
              <li>Provide, operate, and maintain our Service.</li>
              <li>Personalize your experience, such as filtering recipes and providing AI suggestions.</li>
              <li>Communicate with you, including for service-related announcements and customer support.</li>
              <li>Improve our Service by analyzing usage patterns.</li>
            </ul>
          </CardContent>
        </Card>

         <Card>
          <CardHeader>
            <CardTitle>Data Security and Retention</CardTitle>
          </CardHeader>
          <CardContent>
             <p>We implement appropriate technical and organizational measures to protect your personal data. We will retain your personal data only for as long as is necessary to provide the Service to you or as required by law. You may delete your account at any time, which will result in the deletion of your personal data from our active systems.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Third-Party Services</CardTitle>
          </CardHeader>
          <CardContent>
            <p>We use the following third-party services that may process your data:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Supabase:</strong> For database hosting, authentication, and backend infrastructure.</li>
              <li><strong>Google AI (via Genkit):</strong> To power our AI features. Prompts containing the data you provide (e.g., macro targets, dietary preferences) are sent to Google's servers for processing.</li>
              <li><strong>Wix:</strong> For subscription and payment processing if you upgrade your plan.</li>
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
              <li>Access your personal data.</li>
              <li>Rectify inaccurate personal data.</li>
              <li>Erase your personal data ('the right to be forgotten').</li>
              <li>Restrict the processing of your data.</li>
              <li>Data portability.</li>
              <li>Object to processing.</li>
            </ul>
             <p className="mt-4">To exercise these rights, please contact us at [Your Contact Email].</p>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>);
}
