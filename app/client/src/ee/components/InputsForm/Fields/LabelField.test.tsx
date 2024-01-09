import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import "@testing-library/jest-dom";
import { BrowserRouter as Router } from "react-router-dom";

import LabelField from "./LabelField";

function Wrapper({
  children,
  defaultValues,
}: {
  children: React.ReactNode;
  defaultValues?: any;
}) {
  const formMethods = useForm({
    defaultValues,
  });

  return <FormProvider {...formMethods}>{children}</FormProvider>;
}

describe("LabelField", () => {
  it("renders the component with the initial value", () => {
    const onDeleteClick = jest.fn();
    const name = "testName";
    const defaultValues = { [name]: "InitialValue" };

    render(
      <Router>
        <Wrapper defaultValues={defaultValues}>
          <LabelField id="test" name={name} onDeleteClick={onDeleteClick} />
        </Wrapper>
      </Router>,
    );

    // Check if the component is rendered
    const labelInput = screen.getByText(defaultValues[name]);
    expect(labelInput).toBeInTheDocument();
  });

  it("calls onDeleteClick when delete button is clicked", () => {
    const onDeleteClick = jest.fn();
    const name = "testName";

    render(
      <Router>
        <Wrapper>
          <LabelField id="test" name={name} onDeleteClick={onDeleteClick} />
        </Wrapper>
      </Router>,
    );

    // Check if the delete button is rendered
    const deleteButton = screen.getByTestId("t--delete-input-btn");
    fireEvent.click(deleteButton);

    // Ensure that onDeleteClick is called when the delete button is clicked
    expect(onDeleteClick).toHaveBeenCalledTimes(1);
  });
});