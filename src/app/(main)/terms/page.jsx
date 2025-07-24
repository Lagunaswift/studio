import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
export default function TermsOfServicePage() {
    return (<PageWrapper title="Terms of Service">
      <div className="space-y-6 text-foreground/90 leading-relaxed">
        <p>Last updated: [Date]</p>
        <p>Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the MealPlannerPro application (the "Service") operated by MealPlannerPro Ltd. ("us", "we", or "our").</p>

        <Card>
          <CardHeader>
            <CardTitle>1. No Medical Advice</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              The MealPlannerPro application, including all recipes, articles, calculations, and other content, is provided for general informational and educational purposes only. It is not intended to be a substitute for professional medical advice, diagnosis, or treatment. The information provided by the app is not intended to diagnose, treat, cure, or prevent any disease or health condition. Reliance on any information provided by MealPlannerPro is solely at your own risk.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. User Responsibility and Assumption of Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              You are solely responsible for the information you input into the app, including but not limited to, personal health data, allergies, intolerances, and dietary preferences. You acknowledge that you are voluntarily using our services and assume all risks associated with your dietary choices and fitness activities. You are responsible for independently verifying that any recipes or ingredients suggested by the app are appropriate for your specific needs and do not contain any allergens or substances you wish to avoid. MealPlannerPro has no responsibility or liability for any errors in the information you provide or for any adverse outcomes resulting from your use of the app.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Consultation with a Qualified Professional</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              You should always consult with your GP, a Registered Dietitian, or other qualified healthcare provider before beginning any new diet or fitness programme, or if you have any questions regarding a medical condition. Do not disregard, avoid, or delay obtaining medical or health-related advice from your healthcare professional because of something you may have read or calculated on MealPlannerPro. The use of any information provided on this app is solely at your own risk.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>4. Age Requirement</CardTitle>
          </CardHeader>
          <CardContent>
             <p>
              This service is not intended for or directed at individuals under the age of 18. You must be at least 18 years of age to create an account and use MealPlannerPro. By using our service, you represent and warrant that you are at least 18 years old. We do not knowingly collect personal information from children under 18. If we become aware that a child under 18 has provided us with personal information, we will take steps to terminate that person's account and delete their information.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              To the fullest extent permitted by applicable UK law, in no event shall MealPlannerPro Ltd., its directors, employees, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the service; (ii) any conduct or content of any third party on the service; (iii) any content obtained from the service; and (iv) unauthorized access, use, or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory, whether or not we have been informed of the possibility of such damage. In no event shall our aggregate liability for all claims relating to the service exceed the greater of one hundred pounds (£100) or the amount you have paid us, if any, in the last 12 months.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>);
}
