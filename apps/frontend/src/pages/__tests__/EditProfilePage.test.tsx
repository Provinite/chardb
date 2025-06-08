import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockedResponse } from "@apollo/client/testing";

const mocks = vi.hoisted(() => {
  return {
    navigate: vi.fn(),
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      loading: vi.fn(),
      dismiss: vi.fn(),
    },
  };
});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: mocks.toast,
}));

// Now import the component and test utilities
import { EditProfilePage } from "../EditProfilePage";
import { ME_QUERY } from "../../graphql/auth";
import { UPDATE_PROFILE } from "../../graphql/users";
import { render, createMockUser } from "../../__tests__/test-utils";

// Mock GraphQL queries
const mockUserData = createMockUser({
  displayName: "John Doe",
  bio: "Software developer and open source enthusiast",
  location: "San Francisco, CA",
  website: "https://johndoe.com",
  dateOfBirth: "1990-01-01",
  username: "johndoe",
});

const mockMeQuery: MockedResponse = {
  request: {
    query: ME_QUERY,
  },
  result: {
    data: {
      me: mockUserData,
    },
  },
};

const mockMeQueryEmptyProfile: MockedResponse = {
  request: {
    query: ME_QUERY,
  },
  result: {
    data: {
      me: createMockUser({
        displayName: "",
        bio: "",
        location: "",
        website: "",
        dateOfBirth: "",
        username: "emptyuser",
      }),
    },
  },
};

const mockMeQueryPartialProfile: MockedResponse = {
  request: {
    query: ME_QUERY,
  },
  result: {
    data: {
      me: createMockUser({
        displayName: "Jane Smith",
        bio: null,
        location: "New York",
        website: null,
        dateOfBirth: "1985-05-15",
        username: "janesmith",
      }),
    },
  },
};

const mockMeQueryNoUser: MockedResponse = {
  request: {
    query: ME_QUERY,
  },
  result: {
    data: {
      me: null,
    },
  },
};

const mockMeQueryLoading: MockedResponse = {
  request: {
    query: ME_QUERY,
  },
  delay: 1000,
  result: {
    data: {
      me: mockUserData,
    },
  },
};

const mockUpdateProfileMutation: MockedResponse = {
  request: {
    query: UPDATE_PROFILE,
    variables: {
      input: {
        displayName: "Updated Name",
        bio: "Updated bio description",
        location: "San Francisco, CA",
        website: "https://johndoe.com",
        dateOfBirth: "1990-01-01",
      },
    },
  },
  result: {
    data: {
      updateProfile: {
        id: "1",
        username: "johndoe",
        displayName: "Updated Name",
        bio: "Updated bio description",
        avatarUrl: null,
        location: "San Francisco, CA",
        website: "https://johndoe.com",
        dateOfBirth: "1990-01-01",
        isVerified: false,
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      },
    },
  },
};

describe("EditProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication states", () => {
    it("renders login message when user is not authenticated", async () => {
      render(<EditProfilePage />, {
        mocks: [mockMeQueryNoUser],
      });

      await waitFor(() => {
        expect(
          screen.getByText("Please log in to edit your profile."),
        ).toBeInTheDocument();
      });

      // Should not show the form
      expect(screen.queryByText("Edit Profile")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Display Name")).not.toBeInTheDocument();
    });

    it("shows loading spinner when fetching user data", async () => {
      render(<EditProfilePage />, {
        mocks: [mockMeQueryLoading],
      });

      // Check for loading state
      expect(screen.queryByText("Edit Profile")).not.toBeInTheDocument();

      // After loading completes, form should appear
      await waitFor(
        () => {
          expect(screen.getByText("Edit Profile")).toBeInTheDocument();
        },
        { timeout: 2000 },
      );
    });
  });

  describe("Form rendering and prefilling", () => {
    it("renders form with complete user data prefilled", async () => {
      render(<EditProfilePage />, {
        mocks: [mockMeQuery],
      });

      await waitFor(() => {
        expect(screen.getByText("Edit Profile")).toBeInTheDocument();
      });

      // Wait for form to be populated with user data
      await waitFor(() => {
        const displayNameInput = screen.getByLabelText(
          "Display Name",
        ) as HTMLInputElement;
        expect(displayNameInput.value).toBe("John Doe");
      });

      // Check all form fields are prefilled correctly
      const bioTextarea = screen.getByLabelText("Bio") as HTMLTextAreaElement;
      const locationInput = screen.getByLabelText(
        "Location",
      ) as HTMLInputElement;
      const websiteInput = screen.getByLabelText("Website") as HTMLInputElement;
      const dateOfBirthInput = screen.getByLabelText(
        "Date of Birth",
      ) as HTMLInputElement;

      expect(bioTextarea.value).toBe(
        "Software developer and open source enthusiast",
      );
      expect(locationInput.value).toBe("San Francisco, CA");
      expect(websiteInput.value).toBe("https://johndoe.com");
      expect(dateOfBirthInput.value).toBe("1990-01-01");
    });

    it("handles empty profile data gracefully", async () => {
      render(<EditProfilePage />, {
        mocks: [mockMeQueryEmptyProfile],
      });

      await waitFor(() => {
        expect(screen.getByText("Edit Profile")).toBeInTheDocument();
      });

      // Form should populate with empty values from the user data
      await waitFor(() => {
        const displayNameInput = screen.getByLabelText(
          "Display Name",
        ) as HTMLInputElement;
        const bioTextarea = screen.getByLabelText("Bio") as HTMLTextAreaElement;
        const locationInput = screen.getByLabelText(
          "Location",
        ) as HTMLInputElement;
        const websiteInput = screen.getByLabelText(
          "Website",
        ) as HTMLInputElement;
        const dateOfBirthInput = screen.getByLabelText(
          "Date of Birth",
        ) as HTMLInputElement;

        expect(displayNameInput.value).toBe("");
        expect(bioTextarea.value).toBe("");
        expect(locationInput.value).toBe("");
        expect(websiteInput.value).toBe("");
        expect(dateOfBirthInput.value).toBe("");
      });
    });

    it("handles partial profile data (null values) correctly", async () => {
      render(<EditProfilePage />, {
        mocks: [mockMeQueryPartialProfile],
      });

      await waitFor(() => {
        expect(screen.getByText("Edit Profile")).toBeInTheDocument();
      });

      // Wait for form to populate with partial data
      await waitFor(() => {
        const displayNameInput = screen.getByLabelText(
          "Display Name",
        ) as HTMLInputElement;
        expect(displayNameInput.value).toBe("Jane Smith");
      });

      // Check that null values are handled as empty strings
      const bioTextarea = screen.getByLabelText("Bio") as HTMLTextAreaElement;
      const locationInput = screen.getByLabelText(
        "Location",
      ) as HTMLInputElement;
      const websiteInput = screen.getByLabelText("Website") as HTMLInputElement;
      const dateOfBirthInput = screen.getByLabelText(
        "Date of Birth",
      ) as HTMLInputElement;

      expect(bioTextarea.value).toBe(""); // null becomes empty string
      expect(locationInput.value).toBe("New York");
      expect(websiteInput.value).toBe(""); // null becomes empty string
      expect(dateOfBirthInput.value).toBe("1985-05-15");
    });

    it("renders all form fields with correct labels and help text", async () => {
      render(<EditProfilePage />, {
        mocks: [mockMeQuery],
      });

      await waitFor(() => {
        expect(screen.getByText("Edit Profile")).toBeInTheDocument();
      });

      // Check all labels are present
      expect(screen.getByLabelText("Display Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Bio")).toBeInTheDocument();
      expect(screen.getByLabelText("Location")).toBeInTheDocument();
      expect(screen.getByLabelText("Website")).toBeInTheDocument();
      expect(screen.getByLabelText("Date of Birth")).toBeInTheDocument();

      // Check help text is present
      expect(
        screen.getByText("This is how your name will appear to other users"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "A brief description about yourself (max 1000 characters)",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "This information is private and helps us provide age-appropriate content",
        ),
      ).toBeInTheDocument();

      // Check form buttons
      expect(
        screen.getByRole("button", { name: "Cancel" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Save Changes" }),
      ).toBeInTheDocument();
    });
  });

  describe("Form behavior", () => {
    it("disables save button when form is not dirty (unchanged)", async () => {
      render(<EditProfilePage />, {
        mocks: [mockMeQuery],
      });

      await waitFor(() => {
        expect(screen.getByText("Edit Profile")).toBeInTheDocument();
      });

      // Wait for form to be populated
      await waitFor(() => {
        const displayNameInput = screen.getByLabelText(
          "Display Name",
        ) as HTMLInputElement;
        expect(displayNameInput.value).toBe("John Doe");
      });

      // Save button should be disabled when form is not dirty
      const saveButton = screen.getByRole("button", { name: "Save Changes" });
      expect(saveButton).toBeDisabled();
    });

    it("enables save button when form is modified", async () => {
      const user = userEvent.setup();
      render(<EditProfilePage />, {
        mocks: [mockMeQuery, mockUpdateProfileMutation],
      });

      await waitFor(() => {
        expect(screen.getByText("Edit Profile")).toBeInTheDocument();
      });

      // Wait for form to be populated
      await waitFor(() => {
        const displayNameInput = screen.getByLabelText(
          "Display Name",
        ) as HTMLInputElement;
        expect(displayNameInput.value).toBe("John Doe");
      });

      // Modify a field
      const displayNameInput = screen.getByLabelText("Display Name");
      await user.clear(displayNameInput);
      await user.type(displayNameInput, "Updated Name");

      // Save button should now be enabled
      const saveButton = screen.getByRole("button", { name: "Save Changes" });
      expect(saveButton).toBeEnabled();
    });

    it("handles cancel button correctly", async () => {
      const user = userEvent.setup();
      render(<EditProfilePage />, {
        mocks: [mockMeQuery],
      });

      await waitFor(() => {
        expect(screen.getByText("Edit Profile")).toBeInTheDocument();
      });

      // Wait for form to be populated so we have user data
      await waitFor(() => {
        const displayNameInput = screen.getByLabelText(
          "Display Name",
        ) as HTMLInputElement;
        expect(displayNameInput.value).toBe("John Doe");
      });

      // Clear any previous calls
      mocks.navigate.mockClear();

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      await user.click(cancelButton);

      // Should navigate to user profile
      await waitFor(() => {
        expect(mocks.navigate).toHaveBeenCalledWith("/user/johndoe");
      });
    });
  });

  describe("Form submission", () => {
    it("submits updated profile data successfully", async () => {
      const user = userEvent.setup();

      // Need to mock the refetch query that happens after mutation
      const refetchMeQuery: MockedResponse = {
        request: {
          query: ME_QUERY,
        },
        result: {
          data: {
            me: {
              ...mockUserData,
              displayName: "Updated Name",
              bio: "Updated bio description",
            },
          },
        },
      };

      render(<EditProfilePage />, {
        mocks: [mockMeQuery, mockUpdateProfileMutation, refetchMeQuery],
      });

      await waitFor(() => {
        expect(screen.getByText("Edit Profile")).toBeInTheDocument();
      });

      // Wait for form to be populated
      await waitFor(() => {
        const displayNameInput = screen.getByLabelText(
          "Display Name",
        ) as HTMLInputElement;
        expect(displayNameInput.value).toBe("John Doe");
      });

      // Update form fields
      const displayNameInput = screen.getByLabelText("Display Name");
      const bioTextarea = screen.getByLabelText("Bio");

      await user.clear(displayNameInput);
      await user.type(displayNameInput, "Updated Name");

      await user.clear(bioTextarea);
      await user.type(bioTextarea, "Updated bio description");

      // Clear any previous calls
      mocks.toast.success.mockClear();
      mocks.navigate.mockClear();

      // Submit the form
      const saveButton = screen.getByRole("button", { name: "Save Changes" });
      await user.click(saveButton);

      // Should show success message and navigate
      await waitFor(() => {
        expect(mocks.toast.success).toHaveBeenCalledWith(
          "Profile updated successfully!",
        );
      });

      await waitFor(() => {
        expect(mocks.navigate).toHaveBeenCalledWith("/user/johndoe");
      });
    });

    it("preserves unchanged fields during submission", async () => {
      const user = userEvent.setup();

      // Create a mock that expects all non-empty fields (form doesn't track individual changes)
      const partialUpdateMock: MockedResponse = {
        request: {
          query: UPDATE_PROFILE,
          variables: {
            input: {
              displayName: "Just Changed Display Name",
              bio: "Software developer and open source enthusiast",
              location: "San Francisco, CA",
              website: "https://johndoe.com",
              dateOfBirth: "1990-01-01",
            },
          },
        },
        result: {
          data: {
            updateProfile: {
              id: "1",
              username: "johndoe",
              displayName: "Just Changed Display Name",
              bio: "Software developer and open source enthusiast",
              avatarUrl: null,
              location: "San Francisco, CA",
              website: "https://johndoe.com",
              dateOfBirth: "1990-01-01",
              isVerified: false,
              createdAt: "2023-01-01T00:00:00Z",
              updatedAt: "2023-01-01T00:00:00Z",
            },
          },
        },
      };

      const refetchMeQuery: MockedResponse = {
        request: {
          query: ME_QUERY,
        },
        result: {
          data: {
            me: {
              ...mockUserData,
              displayName: "Just Changed Display Name",
            },
          },
        },
      };

      render(<EditProfilePage />, {
        mocks: [mockMeQuery, partialUpdateMock, refetchMeQuery],
      });

      await waitFor(() => {
        expect(screen.getByText("Edit Profile")).toBeInTheDocument();
      });

      // Wait for form to be populated
      await waitFor(() => {
        const displayNameInput = screen.getByLabelText(
          "Display Name",
        ) as HTMLInputElement;
        expect(displayNameInput.value).toBe("John Doe");
      });

      // Only change display name, leave other fields unchanged
      const displayNameInput = screen.getByLabelText("Display Name");
      await user.clear(displayNameInput);
      await user.type(displayNameInput, "Just Changed Display Name");

      // Clear any previous calls
      mocks.toast.success.mockClear();

      // Submit the form
      const saveButton = screen.getByRole("button", { name: "Save Changes" });
      await user.click(saveButton);

      // Should succeed with only changed fields
      await waitFor(() => {
        expect(mocks.toast.success).toHaveBeenCalledWith(
          "Profile updated successfully!",
        );
      });
    });
  });

  describe("Form validation", () => {
    it("validates required field lengths", async () => {
      const user = userEvent.setup();
      render(<EditProfilePage />, {
        mocks: [mockMeQuery],
      });

      await waitFor(() => {
        expect(screen.getByText("Edit Profile")).toBeInTheDocument();
      });

      // Wait for form to be populated
      await waitFor(() => {
        const displayNameInput = screen.getByLabelText(
          "Display Name",
        ) as HTMLInputElement;
        expect(displayNameInput.value).toBe("John Doe");
      });

      // Test display name max length (100 characters)
      const displayNameInput = screen.getByLabelText("Display Name");
      await user.clear(displayNameInput);
      await user.type(displayNameInput, "a".repeat(101)); // Too long

      const saveButton = screen.getByRole("button", { name: "Save Changes" });
      await user.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText(/String must contain at most 100 character/),
        ).toBeInTheDocument();
      });
    });

    it("validates bio field length", async () => {
      const user = userEvent.setup();
      render(<EditProfilePage />, {
        mocks: [mockMeQuery],
      });

      await waitFor(() => {
        expect(screen.getByText("Edit Profile")).toBeInTheDocument();
      });

      // Wait for form to be populated
      await waitFor(() => {
        const bioTextarea = screen.getByLabelText("Bio") as HTMLTextAreaElement;
        expect(bioTextarea.value).toBe("Software developer and open source enthusiast");
      });

      // Enter bio that's too long (over 1000 characters)
      const bioTextarea = screen.getByLabelText("Bio");
      await user.clear(bioTextarea);
      await user.type(bioTextarea, "a".repeat(1001)); // Too long

      const saveButton = screen.getByRole("button", { name: "Save Changes" });
      await user.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText(/String must contain at most 1000 character/),
        ).toBeInTheDocument();
      });
    });

    it("allows empty optional fields", async () => {
      const user = userEvent.setup();

      const emptyFieldsMock: MockedResponse = {
        request: {
          query: UPDATE_PROFILE,
          variables: {
            input: {
              displayName: "Only Required Field",
              // Empty fields are filtered out by the form submission logic
            },
          },
        },
        result: {
          data: {
            updateProfile: {
              id: "1",
              username: "johndoe",
              displayName: "Only Required Field",
              bio: null,
              avatarUrl: null,
              location: null,
              website: null,
              dateOfBirth: null,
              isVerified: false,
              createdAt: "2023-01-01T00:00:00Z",
              updatedAt: "2023-01-01T00:00:00Z",
            },
          },
        },
      };

      const refetchMeQuery: MockedResponse = {
        request: {
          query: ME_QUERY,
        },
        result: {
          data: {
            me: {
              ...mockUserData,
              displayName: "Only Required Field",
              bio: "",
              location: "",
              website: "",
              dateOfBirth: "",
            },
          },
        },
      };

      render(<EditProfilePage />, {
        mocks: [mockMeQuery, emptyFieldsMock, refetchMeQuery],
      });

      await waitFor(() => {
        expect(screen.getByText("Edit Profile")).toBeInTheDocument();
      });

      // Wait for form to be populated
      await waitFor(() => {
        const displayNameInput = screen.getByLabelText(
          "Display Name",
        ) as HTMLInputElement;
        expect(displayNameInput.value).toBe("John Doe");
      });

      // Clear all optional fields and set only display name
      const displayNameInput = screen.getByLabelText("Display Name");
      const bioTextarea = screen.getByLabelText("Bio");
      const locationInput = screen.getByLabelText("Location");
      const websiteInput = screen.getByLabelText("Website");
      const dateOfBirthInput = screen.getByLabelText("Date of Birth");

      await user.clear(displayNameInput);
      await user.type(displayNameInput, "Only Required Field");

      await user.clear(bioTextarea);
      await user.clear(locationInput);
      await user.clear(websiteInput);
      await user.clear(dateOfBirthInput);

      // Submit should succeed
      const saveButton = screen.getByRole("button", { name: "Save Changes" });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mocks.toast.success).toHaveBeenCalledWith(
          "Profile updated successfully!",
        );
      });
    });
  });
});
