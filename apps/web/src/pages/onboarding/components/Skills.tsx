import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import React, { useState } from "react";

const SkillsStep = ({
  skillsText,
  onChange,
}: {
  skillsText: string;
  onChange: (value: string) => void;
}) => {
  // Internal state to manage the text in the input field
  const [inputValue, setInputValue] = useState("");

  // Convert the skills string into an array for mapping
  // This filters out any empty strings that might result from trailing commas
  const skills = skillsText
    ? skillsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const handleRemoveSkill = (indexToRemove: number) => {
    // Create a new array excluding the skill at the specified index
    const newSkills = skills.filter((_, index) => index !== indexToRemove);
    // Call the parent's onChange with the new comma-separated string
    onChange(newSkills.join(","));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Check if Enter or Comma was pressed
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault(); // Prevent form submission or typing a comma

      const newSkill = inputValue.trim();

      // Add the skill if it's not empty and not already in the list
      if (newSkill && !skills.includes(newSkill)) {
        const newSkills = [...skills, newSkill];
        onChange(newSkills.join(","));
      }

      // Clear the input field for the next skill
      setInputValue("");
    }
  };

  return (
    // Removed the grid and the second card
    <Card className="flex flex-col gap-4 p-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Skills</h2>
        <p className="text-sm text-muted-foreground">
          Add or remove skills. We use these to power job matches and resume
          tailoring. Press Enter or Comma (,) to add a new skill.
        </p>
      </div>

      {/* This container will hold the badges and the input field */}
      <div className="flex flex-wrap items-center gap-2 rounded-sm text-sm p-2">
        {skills.map((skill, index) => (
          <Badge key={index} variant="secondary" className="gap-1 p-2">
            {skill}
            <button
              type="button"
              onClick={() => handleRemoveSkill(index)}
              className="rounded-full outline-none ring-offset-background hover:bg-background/50 focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label={`Remove ${skill}`}
            >
              <X className="h-4 w-4" />
            </button>
          </Badge>
        ))}

        {/* The input field for typing new skills */}
        <Input
          className="flex-1/2"
          type="text"
          placeholder="Type a skill and press Enter..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
    </Card>
  );
};

export default SkillsStep;
