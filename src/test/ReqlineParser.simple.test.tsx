import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReqlineParser from "../components/ReqlineParser";
import axios from "axios";

// Mock axios
vi.mock("axios");
const mockedAxios = axios as any;

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn(),
};
Object.assign(navigator, { clipboard: mockClipboard });

// Mock config
vi.mock("../../config", () => ({
  default: {
    apiUrl: "https://test-api.com",
    toastDuration: 3000,
    maxResponseHeight: "24rem",
  },
}));

describe("ReqlineParser - Core Functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClipboard.writeText.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders the main interface", () => {
      render(<ReqlineParser />);

      expect(screen.getByText("Request Syntax")).toBeInTheDocument();
      expect(
        screen.getByText("Enter your Reqline syntax below")
      ).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(screen.getByText("Execute Request")).toBeInTheDocument();
      expect(screen.getByText("Examples (Hide)")).toBeInTheDocument();
      expect(screen.getByText("Clear")).toBeInTheDocument();
    });

    it("shows examples by default", () => {
      render(<ReqlineParser />);

      expect(screen.getByText("Example Requests")).toBeInTheDocument();
      expect(screen.getByText("Simple GET request")).toBeInTheDocument();
      expect(screen.getByText("GET with query parameters")).toBeInTheDocument();
      expect(screen.getByText("POST with body")).toBeInTheDocument();
      expect(
        screen.getByText("Complete request with headers")
      ).toBeInTheDocument();
    });

    it("displays character counter", () => {
      render(<ReqlineParser />);

      expect(screen.getByText("0/10000")).toBeInTheDocument();
    });
  });

  describe("Input Handling", () => {
    it("updates character counter when typing", async () => {
      const user = userEvent.setup();
      render(<ReqlineParser />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "HTTP GET | URL https://example.com");

      expect(screen.getByText("32/10000")).toBeInTheDocument();
    });

    it("enforces maximum input length", async () => {
      const user = userEvent.setup();
      render(<ReqlineParser />);

      const textarea = screen.getByRole("textbox");
      const longInput = "A".repeat(10001);
      await user.type(textarea, longInput);

      expect(textarea).toHaveValue("A".repeat(10000));
    });
  });

  describe("Form Submission", () => {
    it("submits valid request successfully", async () => {
      const user = userEvent.setup();
      const mockResponse = {
        data: {
          request: {
            full_url: "https://dummyjson.com/quotes/3",
            query: {},
            headers: {},
            body: {},
          },
          response: {
            http_status: 200,
            duration: 150,
            request_start_timestamp: Date.now(),
            request_stop_timestamp: Date.now() + 150,
            response_data: { id: 1, quote: "Test quote" },
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      render(<ReqlineParser />);

      const textarea = screen.getByRole("textbox");
      const submitButton = screen.getByText("Execute Request");

      await user.type(
        textarea,
        "HTTP GET | URL https://dummyjson.com/quotes/3"
      );
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          "https://test-api.com/",
          { reqline: "HTTP GET | URL https://dummyjson.com/quotes/3" },
          {
            timeout: 30000,
            headers: { "Content-Type": "application/json" },
          }
        );
      });

      await waitFor(() => {
        expect(screen.getByText("Request Details")).toBeInTheDocument();
        expect(screen.getByText("Response Details")).toBeInTheDocument();
      });
    });

    it("shows error for empty input", async () => {
      const user = userEvent.setup();
      render(<ReqlineParser />);

      const submitButton = screen.getByText("Execute Request");
      await user.click(submitButton);

      expect(screen.getByText("Reqline input is required")).toBeInTheDocument();
    });

    it("handles API errors gracefully", async () => {
      const user = userEvent.setup();
      const mockError = new Error("Network error");
      mockedAxios.post.mockRejectedValue(mockError);

      render(<ReqlineParser />);

      const textarea = screen.getByRole("textbox");
      const submitButton = screen.getByText("Execute Request");

      await user.type(textarea, "HTTP GET | URL https://example.com");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(
            "Network error. Please check your connection and try again."
          )
        ).toBeInTheDocument();
      });
    });
  });

  describe("Examples Section", () => {
    it("toggles examples visibility", async () => {
      const user = userEvent.setup();
      render(<ReqlineParser />);

      // Examples should be visible by default
      expect(screen.getByText("Example Requests")).toBeInTheDocument();

      const toggleButton = screen.getByText(/Examples.*Hide/);
      await user.click(toggleButton);

      // Examples should be hidden
      await waitFor(() => {
        expect(screen.queryByText("Example Requests")).not.toBeInTheDocument();
      });

      // Click again to show
      const showButton = screen.getByText(/Examples.*Show/);
      await user.click(showButton);

      await waitFor(() => {
        expect(screen.getByText("Example Requests")).toBeInTheDocument();
      });
    });

    it("auto-collapses examples when submitting request", async () => {
      const user = userEvent.setup();
      const mockResponse = {
        data: {
          request: {
            full_url: "https://example.com",
            query: {},
            headers: {},
            body: {},
          },
          response: {
            http_status: 200,
            duration: 100,
            request_start_timestamp: Date.now(),
            request_stop_timestamp: Date.now() + 100,
            response_data: {},
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      render(<ReqlineParser />);

      // Examples should be visible initially
      expect(screen.getByText("Example Requests")).toBeInTheDocument();

      const textarea = screen.getByRole("textbox");
      const submitButton = screen.getByText("Execute Request");

      await user.type(textarea, "HTTP GET | URL https://example.com");
      await user.click(submitButton);

      // Examples should be hidden after submission
      await waitFor(() => {
        expect(screen.queryByText("Example Requests")).not.toBeInTheDocument();
      });
    });
  });

  describe("Clear Functionality", () => {
    it("clears all data when clear button is clicked", async () => {
      const user = userEvent.setup();
      render(<ReqlineParser />);

      const textarea = screen.getByRole("textbox");
      const clearButton = screen.getByText("Clear");

      await user.type(textarea, "HTTP GET | URL https://example.com");
      await user.click(clearButton);

      expect(textarea).toHaveValue("");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels", () => {
      render(<ReqlineParser />);

      expect(screen.getByLabelText("Reqline syntax input")).toBeInTheDocument();
      expect(screen.getByLabelText("Execute request")).toBeInTheDocument();
      expect(screen.getByLabelText("Hide examples")).toBeInTheDocument();
      expect(screen.getByLabelText("Clear all data")).toBeInTheDocument();
    });

    it("has proper form labels and descriptions", () => {
      render(<ReqlineParser />);

      expect(screen.getByText("Request Syntax")).toBeInTheDocument();
      expect(
        screen.getByText("Enter your Reqline syntax below")
      ).toBeInTheDocument();
    });
  });
});
