"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Factory,
  ShoppingCart,
  Stethoscope,
  GraduationCap,
  Utensils,
  Truck,
  Landmark,
  Cpu,
  Leaf,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  CheckCircle2,
  Hotel,
  Briefcase,
  CalendarDays,
} from "lucide-react";
import { getIndustryTemplates } from "@/lib/actions/industry";
import { applyOnboardingTemplate } from "./actions";
import { toast } from "sonner";

type TemplatesMap = Awaited<ReturnType<typeof getIndustryTemplates>>;
type Template = TemplatesMap[string][number];

const industryIcons: Record<string, React.ReactNode> = {
  "Construction & Civil": <Building2 className="h-8 w-8" />,
  "Manufacturing & Production": <Factory className="h-8 w-8" />,
  "Retail & eCommerce": <ShoppingCart className="h-8 w-8" />,
  "Healthcare & Wellness": <Stethoscope className="h-8 w-8" />,
  "Education & Training": <GraduationCap className="h-8 w-8" />,
  "Food & Beverage": <Utensils className="h-8 w-8" />,
  "Hospitality & Tourism": <Hotel className="h-8 w-8" />,
  "Logistics & Supply Chain": <Truck className="h-8 w-8" />,
  "Real Estate": <Landmark className="h-8 w-8" />,
  "Technology & IT": <Cpu className="h-8 w-8" />,
  "Agriculture & Allied": <Leaf className="h-8 w-8" />,
  "Professional Services": <Briefcase className="h-8 w-8" />,
  "Events, Clubs & Non-Profit": <CalendarDays className="h-8 w-8" />,
};

const steps = [
  { label: "Select Industry", description: "Choose your industry" },
  { label: "Sub-Category", description: "Pick a specialization" },
  { label: "Review", description: "Confirm settings" },
  { label: "Apply", description: "Finish setup" },
];

export default function OnboardingWizardPage() {
  const [templates, setTemplates] = useState<TemplatesMap>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [applied, setApplied] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getIndustryTemplates();
        setTemplates(data);
      } catch {
        toast.error("Failed to load industry templates");
      }
    });
  }, []);

  function handleNext() {
    if (currentStep === 0 && !selectedIndustry) {
      toast.error("Please select an industry");
      return;
    }
    if (currentStep === 1 && !selectedTemplate) {
      toast.error("Please select a sub-category");
      return;
    }
    if (currentStep === 2) {
      handleApply();
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function handleBack() {
    if (currentStep === 1) {
      setSelectedTemplate(null);
    }
    setCurrentStep((s) => Math.max(s - 1, 0));
  }

  function handleApply() {
    if (!selectedTemplate) return;
    startTransition(async () => {
      try {
        // Use the tenantId from session (the server action handles this)
        await applyOnboardingTemplate(selectedTemplate.id);
        setApplied(true);
        setCurrentStep(3);
        toast.success("Industry template applied successfully");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to apply template");
      }
    });
  }

  const industries = Object.keys(templates);
  const subCategories = selectedIndustry ? (templates[selectedIndustry] ?? []) : [];

  // Extract config details from the selected template for the review step
  const reviewDepartments = selectedTemplate
    ? (selectedTemplate.departments as Array<{ name: string }>) ?? []
    : [];
  const reviewExpenseCategories = selectedTemplate
    ? (selectedTemplate.expenseCategories as Array<{ name: string }>) ?? []
    : [];
  const reviewLeaveTypes = selectedTemplate
    ? (selectedTemplate.leaveTypes as Array<{ name: string; days: number }>) ?? []
    : [];
  const reviewModules = selectedTemplate
    ? (selectedTemplate.modules as string[]) ?? []
    : [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Onboarding Wizard</h1>
        <p className="text-muted-foreground mt-1">
          Configure your workspace with industry-specific settings
        </p>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-2">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-2 flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  i < currentStep
                    ? "bg-green-500 text-white"
                    : i === currentStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className="text-xs mt-1 text-center">{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 mt-[-16px] ${
                  i < currentStep ? "bg-green-500" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {/* Step 1: Select Industry */}
        {currentStep === 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {industries.map((industry) => (
              <Card
                key={industry}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedIndustry === industry
                    ? "ring-2 ring-primary border-primary"
                    : ""
                }`}
                onClick={() => {
                  setSelectedIndustry(industry);
                  setSelectedTemplate(null);
                }}
              >
                <CardContent className="flex flex-col items-center justify-center p-6 text-center gap-3">
                  <div className="text-muted-foreground">
                    {industryIcons[industry] ?? <Building2 className="h-8 w-8" />}
                  </div>
                  <span className="font-medium text-sm">{industry}</span>
                </CardContent>
              </Card>
            ))}
            {industries.length === 0 && !isPending && (
              <p className="col-span-full text-center text-muted-foreground py-12">
                No industry templates found.
              </p>
            )}
            {isPending && (
              <div className="col-span-full flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Sub-Category */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{selectedIndustry} Sub-Categories</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subCategories.map((tmpl) => (
                <Card
                  key={tmpl.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedTemplate?.id === tmpl.id
                      ? "ring-2 ring-primary border-primary"
                      : ""
                  }`}
                  onClick={() => setSelectedTemplate(tmpl)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{tmpl.displayName}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary">{tmpl.subCategory}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {currentStep === 2 && selectedTemplate && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">
              Review: {selectedTemplate.displayName}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Departments ({reviewDepartments.length})</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {reviewDepartments.map((d) => (
                    <Badge key={d.name} variant="outline">{d.name}</Badge>
                  ))}
                  {reviewDepartments.length === 0 && (
                    <span className="text-muted-foreground text-sm">None</span>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Expense Categories ({reviewExpenseCategories.length})</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {reviewExpenseCategories.map((ec) => (
                    <Badge key={ec.name} variant="outline">{ec.name}</Badge>
                  ))}
                  {reviewExpenseCategories.length === 0 && (
                    <span className="text-muted-foreground text-sm">None</span>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Leave Types ({reviewLeaveTypes.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {reviewLeaveTypes.map((lt) => (
                      <div key={lt.name} className="flex justify-between text-sm">
                        <span>{lt.name}</span>
                        <span className="text-muted-foreground">{lt.days} days/year</span>
                      </div>
                    ))}
                    {reviewLeaveTypes.length === 0 && (
                      <span className="text-muted-foreground text-sm">None</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Modules ({reviewModules.length})</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {reviewModules.map((m) => (
                    <Badge key={m} variant="secondary">{m}</Badge>
                  ))}
                  {reviewModules.length === 0 && (
                    <span className="text-muted-foreground text-sm">None</span>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step 4: Applied */}
        {currentStep === 3 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <h2 className="text-xl font-semibold">Setup Complete</h2>
            <p className="text-muted-foreground text-center max-w-md">
              Your workspace has been configured with the{" "}
              <strong>{selectedTemplate?.displayName}</strong> template. Departments,
              leave types, expense categories, and modules have been applied.
            </p>
            <Button onClick={() => (window.location.href = "/settings")}>
              Go to Settings
            </Button>
          </div>
        )}
      </div>

      {/* Navigation */}
      {currentStep < 3 && (
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button onClick={handleNext} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {currentStep === 2 ? "Apply Template" : "Next"}
            {currentStep < 2 && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </div>
      )}
    </div>
  );
}
